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
          terrain_classification?: any | null
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
          terrain_classification?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      processing_jobs: {
        Row: {
          id: string
          image_id: string
          user_id: string
          job_type: 'golf_course_classification'
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
          job_type: 'golf_course_classification'
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
          job_type?: 'golf_course_classification'
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
    }
  }
}
