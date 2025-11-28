import { supabase } from './supabase'
import type { Database } from './supabase'

type ClientGolfCourse = Database['public']['Tables']['client_golf_courses']['Row']
type GolfClub = Database['public']['Tables']['golf_clubs']['Row']

export interface ClientCourseAssignment {
  id: string
  client_id: string
  golf_club_id: string
  assigned_at: string
  is_active: boolean
  users?: {
    id: string
    email: string
    full_name: string | null
  }
  golf_clubs?: {
    id: string
    name: string
  }
}

export interface ClientCourse {
  golf_club_id: string
  golf_club_name: string
  assigned_at: string
  is_active: boolean
}

export class ClientCourseService {
  /**
   * Get all golf courses assigned to a specific client
   */
  static async getClientCourses(clientId: string): Promise<ClientCourse[]> {
    try {
      const { data, error } = await supabase.rpc('get_client_golf_courses', {
        user_id: clientId,
      })

      if (error) {
        console.error('Error fetching client courses:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to get client courses:', error)
      return []
    }
  }

  /**
   * Get all golf courses assigned to the current authenticated client
   */
  static async getMyGolfCourses(): Promise<ClientCourse[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      return await this.getClientCourses(user.id)
    } catch (error) {
      console.error('Failed to get my golf courses:', error)
      return []
    }
  }

  /**
   * Check if a client has access to a specific golf course
   */
  static async hasAccess(clientId: string, golfClubId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('client_has_course_access', {
        user_id: clientId,
        course_id: golfClubId,
      })

      if (error) {
        console.error('Error checking course access:', error)
        return false
      }

      return data || false
    } catch (error) {
      console.error('Failed to check course access:', error)
      return false
    }
  }

  /**
   * Assign a client to a golf course (admin only)
   */
  static async assignClientToCourse(
    clientId: string,
    golfClubId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('assign_client_to_course', {
        p_client_id: clientId,
        p_golf_club_id: golfClubId,
        p_assigned_by: user.id,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Remove a client from a golf course (admin only)
   */
  static async removeClientFromCourse(
    clientId: string,
    golfClubId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('remove_client_from_course', {
        p_client_id: clientId,
        p_golf_club_id: golfClubId,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get all client-course assignments (admin only)
   */
  static async getAllAssignments(): Promise<ClientCourseAssignment[]> {
    try {
      const { data, error } = await supabase
        .from('client_golf_courses')
        .select(
          `
          id,
          client_id,
          golf_club_id,
          assigned_at,
          is_active,
          users:client_id (
            id,
            email,
            full_name
          ),
          golf_clubs:golf_club_id (
            id,
            name
          )
        `
        )
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })

      if (error) {
        console.error('Error fetching assignments:', error)
        return []
      }

      return (data as any) || []
    } catch (error) {
      console.error('Failed to get assignments:', error)
      return []
    }
  }

  /**
   * Get all clients assigned to a specific golf course
   */
  static async getClientsForCourse(golfClubId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('client_golf_courses')
        .select(
          `
          id,
          client_id,
          assigned_at,
          is_active,
          users:client_id (
            id,
            email,
            full_name,
            role
          )
        `
        )
        .eq('golf_club_id', golfClubId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false })

      if (error) {
        console.error('Error fetching clients for course:', error)
        return []
      }

      return (data as any) || []
    } catch (error) {
      console.error('Failed to get clients for course:', error)
      return []
    }
  }

  /**
   * Bulk assign multiple courses to a client
   */
  static async bulkAssignCoursesToClient(
    clientId: string,
    golfClubIds: string[]
  ): Promise<{ success: boolean; error?: string; successCount: number }> {
    let successCount = 0

    for (const golfClubId of golfClubIds) {
      const result = await this.assignClientToCourse(clientId, golfClubId)
      if (result.success) {
        successCount++
      }
    }

    if (successCount === golfClubIds.length) {
      return { success: true, successCount }
    } else if (successCount > 0) {
      return {
        success: false,
        error: `Only ${successCount} of ${golfClubIds.length} courses were assigned`,
        successCount,
      }
    } else {
      return { success: false, error: 'Failed to assign any courses', successCount: 0 }
    }
  }

  /**
   * Get count of courses assigned to a client
   */
  static async getClientCourseCount(clientId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('client_golf_courses')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true)

      if (error) {
        console.error('Error counting client courses:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Failed to count client courses:', error)
      return 0
    }
  }
}
