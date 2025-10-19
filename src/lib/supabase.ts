import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create client with additional options to fix authentication issues
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'phytomaps-auth-token'
  },
  global: {
    headers: {
      'X-Client-Info': 'phytomaps-web-app'
    }
  }
})

// Initialize auth on client load
const initAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.log('No active session, creating demo session')
      await supabase.auth.signInWithPassword({
        email: 'demo@phytomaps.com',
        password: 'demo123'
      }).catch(async () => {
        // If sign in fails, try to sign up
        await supabase.auth.signUp({
          email: 'demo@phytomaps.com',
          password: 'demo123'
        })
      })
    }
  } catch (error) {
    console.error('Auth initialization error:', error)
  }
}

// Initialize auth immediately
initAuth()

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          organization: string | null
          role: 'admin' | 'client'
          club_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          organization?: string | null
          role?: 'admin' | 'client'
          club_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          organization?: string | null
          role?: 'admin' | 'client'
          club_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      golf_clubs: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      images: {
        Row: {
          id: string
          user_id: string
          filename: string
          original_filename: string
          bucket: string
          path: string
          file_size: number | null
          content_type: string
          lat: number | null
          lon: number | null
          zoom_level: number | null
          tile_x: number | null
          tile_y: number | null
          status: 'uploaded' | 'processing' | 'processed' | 'failed'
          processing_started_at: string | null
          processing_completed_at: string | null
          analysis_results: any | null
          terrain_classification: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          original_filename: string
          bucket?: string
          path: string
          file_size?: number | null
          content_type?: string
          lat?: number | null
          lon?: number | null
          zoom_level?: number | null
          tile_x?: number | null
          tile_y?: number | null
          status?: 'uploaded' | 'processing' | 'processed' | 'failed'
          processing_started_at?: string | null
          processing_completed_at?: string | null
          analysis_results?: any | null
          ndvi_score?: number | null
          vegetation_health?: 'healthy' | 'moderate' | 'poor' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          original_filename?: string
          bucket?: string
          path?: string
          file_size?: number | null
          content_type?: string
          lat?: number | null
          lon?: number | null
          zoom_level?: number | null
          tile_x?: number | null
          tile_y?: number | null
          status?: 'uploaded' | 'processing' | 'processed' | 'failed'
          processing_started_at?: string | null
          processing_completed_at?: string | null
          analysis_results?: any | null
          ndvi_score?: number | null
          vegetation_health?: 'healthy' | 'moderate' | 'poor' | null
          created_at?: string
          updated_at?: string
        }
      }
      processing_jobs: {
        Row: {
          id: string
          image_id: string
          user_id: string
          job_type: 'ndvi_analysis' | 'vegetation_health' | 'terrain_analysis'
          status: 'queued' | 'processing' | 'completed' | 'failed'
          priority: number
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          results: any | null
          output_paths: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          image_id: string
          user_id: string
          job_type: 'ndvi_analysis' | 'vegetation_health' | 'terrain_analysis'
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          priority?: number
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          results?: any | null
          output_paths?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          image_id?: string
          user_id?: string
          job_type?: 'ndvi_analysis' | 'vegetation_health' | 'terrain_analysis'
          status?: 'queued' | 'processing' | 'completed' | 'failed'
          priority?: number
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          results?: any | null
          output_paths?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      analysis_sessions: {
        Row: {
          id: string
          user_id: string
          session_name: string
          description: string | null
          bounds: any | null
          status: 'active' | 'completed' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_name: string
          description?: string | null
          bounds?: any | null
          status?: 'active' | 'completed' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_name?: string
          description?: string | null
          bounds?: any | null
          status?: 'active' | 'completed' | 'archived'
          created_at?: string
          updated_at?: string
        }
      }
      session_images: {
        Row: {
          id: string
          session_id: string
          image_id: string
          added_at: string
        }
        Insert: {
          id?: string
          session_id: string
          image_id: string
          added_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          image_id?: string
          added_at?: string
        }
      }
      golf_course_tilesets: {
        Row: {
          id: string
          golf_club_id: string
          name: string
          description: string | null
          min_lat: number
          max_lat: number
          min_lon: number
          max_lon: number
          center_lat: number
          center_lon: number
          min_zoom: number
          max_zoom: number
          default_zoom: number
          r2_folder_path: string
          tile_url_pattern: string
          tile_size: number
          format: 'png' | 'jpg' | 'webp'
          attribution: string | null
          metadata: any | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          golf_club_id: string
          name: string
          description?: string | null
          min_lat: number
          max_lat: number
          min_lon: number
          max_lon: number
          center_lat: number
          center_lon: number
          min_zoom?: number
          max_zoom?: number
          default_zoom?: number
          r2_folder_path: string
          tile_url_pattern: string
          tile_size?: number
          format?: 'png' | 'jpg' | 'webp'
          attribution?: string | null
          metadata?: any | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          golf_club_id?: string
          name?: string
          description?: string | null
          min_lat?: number
          max_lat?: number
          min_lon?: number
          max_lon?: number
          center_lat?: number
          center_lon?: number
          min_zoom?: number
          max_zoom?: number
          default_zoom?: number
          r2_folder_path?: string
          tile_url_pattern?: string
          tile_size?: number
          format?: 'png' | 'jpg' | 'webp'
          attribution?: string | null
          metadata?: any | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
