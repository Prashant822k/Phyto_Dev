import { supabase } from './supabase'
import type { Database } from './supabase'
import { v4 as uuidv4 } from './uuid'



type Image = Database['public']['Tables']['images']['Row']
type ImageInsert = Database['public']['Tables']['images']['Insert']
type ImageUpdate = Database['public']['Tables']['images']['Update']

type ImageWithSession = Image & {
  analysis_sessions: Database['public']['Tables']['analysis_sessions']['Row'] | null
}



export interface UploadResult {
  success: boolean
  image?: Image
  error?: string
  publicUrl?: string
}

export interface UploadTileResponse {
  id: string
  url: string
}

export interface ProcessingStatus {
  status: 'uploaded' | 'processing' | 'processed' | 'failed'
  progress?: number
  message?: string
}

export class ImageService {
  /**
   * Upload a PNG tile to Supabase Storage and save metadata to database
   */
  static async uploadTile(
    file: File,
    metadata: {
      lat?: number
      lon?: number
      zoomLevel?: number
      tileX?: number
      tileY?: number
      useR2?: boolean
    }
  ): Promise<UploadResult> {
    try {
      // Validate file type
      if (!file.type.includes('image/png')) {
        throw new Error('Only PNG files are allowed')
      }

      // Get current user - first check session
      const { data: sessionData } = await supabase.auth.getSession()
      
      // If no active session, try to sign in with demo account for development
      if (!sessionData.session) {
        console.log('No active session, attempting to create demo session')
        // Create a demo user session for development purposes
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'demo@phytomaps.com',
          password: 'demo123',
        })
        
        if (signUpError) {
          console.error('Failed to create demo session:', signUpError)
          // Try to sign in if user already exists
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'demo@phytomaps.com',
            password: 'demo123',
          })
          
          if (signInError) {
            console.error('Failed to sign in with demo account:', signInError)
            throw new Error('Authentication failed. Please log in again.')
          }
        }
      }
      
      // Get user after ensuring session
      const { data: { user: authenticatedUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !authenticatedUser) {
        throw new Error('User not authenticated. Please log in again.')
      }

      // Generate unique filename
      const timestamp = Date.now()
      const filename = `${timestamp}_${file.name}`
      const filePath = `${authenticatedUser.id}/${filename}`

      console.log('Uploading file to Supabase Storage:', { 
        bucket: 'raw-images', 
        filePath, 
        userId: authenticatedUser.id 
      })

      // Upload to Supabase Storage with retry
      let uploadAttempt = 0
      let uploadData, uploadError
      
      while (uploadAttempt < 3) {
        uploadAttempt++
        
        // Upload to Supabase Storage
        const uploadResponse = await supabase.storage
          .from('raw-images')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: uploadAttempt > 1 // Allow upsert on retry attempts
          })
          
        uploadData = uploadResponse.data
        uploadError = uploadResponse.error
        
        // Debug log to help diagnose upload issues
        console.debug(`Supabase upload attempt ${uploadAttempt} result:`, { uploadData, uploadError })
        
        if (!uploadError) break
        
        // Wait before retry
        if (uploadAttempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      if (uploadError) {
        // Include the full error message from Supabase for easier debugging in the browser console
        throw new Error(`Upload failed: ${uploadError.message || JSON.stringify(uploadError)}`)
      }

      // Get public URL
      const publicUrlResp = supabase.storage
        .from('raw-images')
        .getPublicUrl(filePath)

      // Debug log to inspect the public URL response shape
      console.debug('getPublicUrl response:', publicUrlResp)

      const { data: { publicUrl } } = publicUrlResp
        
      const uploadResult = {
        success: true,
        url: publicUrl,
        key: filePath
      }

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error('Upload failed')
      }

      // Save metadata to database
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('User not authenticated')
      }
      const imageData: ImageInsert = {
        user_id: user.id,
        filename: filename,
        original_filename: file.name,
        bucket: 'raw-images',
        path: filePath,
        file_size: file.size,
        content_type: file.type,
        lat: metadata.lat || null,
        lon: metadata.lon || null,
        zoom_level: metadata.zoomLevel || null,
        tile_x: metadata.tileX || null,
        tile_y: metadata.tileY || null,
        status: 'uploaded'
      }

      const { data: imageRecord, error: dbError } = await supabase
        .from('images')
        .insert(imageData)
        .select()
        .single()

      if (dbError) {
        // If database insert fails, clean up the uploaded file
        await supabase.storage
          .from('raw-images')
          .remove([filePath])
        throw new Error(`Database error: ${dbError.message}`)
      }

      return {
        success: true,
        image: imageRecord,
        publicUrl
      }
    } catch (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get all images for the current user
   */
  static async getUserImages(): Promise<Image[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch images: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Fetch images error:', error)
      throw error
    }
  }

  /**
   * Get a specific image by ID
   */
  static async getImageById(imageId: string): Promise<Image | null> {
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('id', imageId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Image not found
        }
        throw new Error(`Failed to fetch image: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Fetch image error:', error)
      throw error
    }
  }

  /**
   * Get processing status for an image
   */
  static async getProcessingStatus(imageId: string): Promise<ProcessingStatus> {
    try {
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('status, error_message')
        .eq('image_id', imageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return { status: 'uploaded' }
        }
        throw new Error(`Failed to fetch processing status: ${error.message}`)
      }

      return {
        status: data.status as any,
        message: data.error_message || undefined
      }
    } catch (error) {
      console.error('Fetch processing status error:', error)
      return { status: 'failed', message: 'Failed to fetch status' }
    }
  }

  /**
   * Update image metadata
   */
  static async updateImage(imageId: string, updates: ImageUpdate): Promise<Image> {
    try {
      const { data, error } = await supabase
        .from('images')
        .update(updates)
        .eq('id', imageId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update image: ${error.message}`)
      }

      return data
    } catch (error) {
      console.error('Update image error:', error)
      throw error
    }
  }

  /**
   * Delete an image and its associated files
   */
  static async deleteImage(imageId: string): Promise<boolean> {
    try {
      // Get image details first
      const image = await this.getImageById(imageId)
      if (!image) {
        throw new Error('Image not found')
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(image.bucket)
        .remove([image.path])

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError.message)
      }

      // Delete from database (this will cascade to processing_jobs)
      const { error: dbError } = await supabase
        .from('images')
        .delete()
        .eq('id', imageId)

      if (dbError) {
        throw new Error(`Failed to delete image: ${dbError.message}`)
      }

      return true
    } catch (error) {
      console.error('Delete image error:', error)
      throw error
    }
  }

  /**
   * Upload multiple PNG tiles in batch
   */
  static async uploadMultipleTiles(
    files: File[],
    metadata: {
      lat?: number
      lon?: number
      zoomLevel?: number
      tileX?: number
      tileY?: number
      useR2?: boolean
    },
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<UploadResult>> {
    const results: UploadResult[] = []
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadTile(files[i], metadata)
        results.push(result)
        onProgress?.(i + 1, files.length)
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        onProgress?.(i + 1, files.length)
      }
    }
    
    return results
  }

  /**
   * Get public URL for an image
   */
  static getImageUrl(image: Image): string {
    const { data: { publicUrl } } = supabase.storage
      .from(image.bucket)
      .getPublicUrl(image.path)
    return publicUrl
  }

  /**
   * Subscribe to real-time updates for image processing status
   */
  static subscribeToImageUpdates(
    imageId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`image-${imageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'images',
          filter: `id=eq.${imageId}`
        },
        callback
      )
      .subscribe()
  }

  /**
   * Subscribe to real-time updates for processing jobs
   */
  static subscribeToJobUpdates(
    imageId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel(`jobs-${imageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_jobs',
          filter: `image_id=eq.${imageId}`
        },
        callback
      )
      .subscribe()
  }
}
