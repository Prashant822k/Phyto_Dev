import { supabase } from './supabase';

/**
 * Service for secure tile access with club-level authorization
 */
export class TileAccessService {
  /**
   * Get a signed URL for a single tile
   * @param courseId - The course identifier (e.g., 'pine-valley-golf-club')
   * @param z - Zoom level
   * @param x - Tile X coordinate
   * @param y - Tile Y coordinate
   * @param expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
   * @returns Signed URL that expires after the specified time
   */
  static async getSignedTileUrl(
    courseId: string,
    z: number,
    x: number,
    y: number,
    expiresIn: number = 3600
  ): Promise<string> {
    const key = `${courseId}/tiles/${z}/${x}/${y}.png`;

    const { data, error } = await supabase.functions.invoke('r2-sign', {
      body: {
        action: 'getSignedTileUrl',
        key,
        expiresInSeconds: expiresIn,
      },
    });

    if (error) throw new Error(`Failed to get signed URL: ${error.message}`);
    if (!data?.url) throw new Error('No URL returned from server');

    return data.url;
  }

  /**
   * Get tile URL pattern for Mapbox with embedded authentication
   * This creates a URL template that Mapbox can use to fetch tiles
   * @param courseId - The course identifier
   * @returns URL pattern like: https://...supabase.co/functions/v1/tile-proxy?course={courseId}&z={z}&x={x}&y={y}
   */
  static async getTileUrlPattern(courseId: string): Promise<string> {
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) throw new Error('Not authenticated');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const token = session.session.access_token;

    // Return URL pattern with authentication token
    // Mapbox will replace {z}, {x}, {y} with actual tile coordinates
    return `${supabaseUrl}/functions/v1/tile-proxy?courseId=${courseId}&z={z}&x={x}&y={y}&token=${token}`;
  }

  /**
   * Verify user has access to a specific tileset
   * @param courseId - The course identifier
   * @returns true if user has access, false otherwise
   */
  static async verifyTilesetAccess(courseId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('golf_course_tilesets')
        .select('id, golf_club_id')
        .eq('r2_folder_path', `${courseId}/tiles`)
        .eq('is_active', true)
        .single();

      if (error || !data) return false;

      // RLS will automatically filter based on user's club_id
      // If we get a result, user has access
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get tileset metadata for a course (respects RLS)
   * @param courseId - The course identifier
   * @returns Tileset metadata or null if not found/no access
   */
  static async getTilesetMetadata(courseId: string) {
    const { data, error } = await supabase
      .from('golf_course_tilesets')
      .select('*')
      .eq('r2_folder_path', `${courseId}/tiles`)
      .eq('is_active', true)
      .single();

    if (error) return null;
    return data;
  }
}
