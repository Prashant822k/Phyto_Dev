import { supabase } from './supabase'
import { R2Service } from './r2Service'
import type { Database } from './supabase'

type GolfCourseTileset = Database['public']['Tables']['golf_course_tilesets']['Row']
type TilesetInsert = Database['public']['Tables']['golf_course_tilesets']['Insert']

export interface TilesetMetadata {
  name: string
  description?: string
  bounds: {
    minLat: number
    maxLat: number
    minLon: number
    maxLon: number
  }
  center: {
    lat: number
    lon: number
  }
  zoom: {
    min: number
    max: number
    default: number
  }
  r2FolderPath: string
  tileUrlPattern: string
  tileSize?: number
  format?: 'png' | 'jpg' | 'webp'
  attribution?: string
}

export class TilesetService {
  /**
   * Get tileset for a specific golf club
   */
  static async getTilesetForGolfClub(golfClubId: string): Promise<GolfCourseTileset | null> {
    try {
      const { data, error } = await supabase
        .from('golf_course_tilesets')
        .select('*')
        .eq('golf_club_id', golfClubId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching tileset:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Failed to get tileset:', error)
      return null
    }
  }

  /**
   * Get all tilesets for a golf club
   */
  static async getTilesetsForGolfClub(golfClubId: string): Promise<GolfCourseTileset[]> {
    try {
      const { data, error } = await supabase
        .from('golf_course_tilesets')
        .select('*')
        .eq('golf_club_id', golfClubId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Failed to get tilesets:', error)
      return []
    }
  }

  /**
   * Create a new tileset
   */
  static async createTileset(
    golfClubId: string,
    metadata: TilesetMetadata
  ): Promise<GolfCourseTileset | null> {
    try {
      const tilesetData: TilesetInsert = {
        golf_club_id: golfClubId,
        name: metadata.name,
        description: metadata.description,
        min_lat: metadata.bounds.minLat,
        max_lat: metadata.bounds.maxLat,
        min_lon: metadata.bounds.minLon,
        max_lon: metadata.bounds.maxLon,
        center_lat: metadata.center.lat,
        center_lon: metadata.center.lon,
        min_zoom: metadata.zoom.min,
        max_zoom: metadata.zoom.max,
        default_zoom: metadata.zoom.default,
        r2_folder_path: metadata.r2FolderPath,
        tile_url_pattern: metadata.tileUrlPattern,
        tile_size: metadata.tileSize || 256,
        format: metadata.format || 'png',
        attribution: metadata.attribution,
        is_active: true
      }

      const { data, error } = await supabase
        .from('golf_course_tilesets')
        .insert(tilesetData)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Failed to create tileset:', error)
      return null
    }
  }

  /**
   * Generate tile URL with signed R2 URL
   * This method returns a function that can be used by Mapbox GL
   */
  static async generateTileUrlFunction(
    tileset: GolfCourseTileset
  ): Promise<(coords: { x: number; y: number; z: number }) => Promise<string>> {
    return async (coords: { x: number; y: number; z: number }) => {
      const tileKey = `${tileset.r2_folder_path}/${tileset.tile_url_pattern}`
        .replace('{z}', coords.z.toString())
        .replace('{x}', coords.x.toString())
        .replace('{y}', coords.y.toString())

      try {
        const { url } = await R2Service.getGetUrl(tileKey, 3600) // 1 hour expiry
        return url
      } catch (error) {
        console.error('Failed to get tile URL:', error)
        // Return a transparent 1x1 PNG as fallback
        return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    }
  }

  /**
   * Get TileJSON format (Mapbox compatible)
   * This is useful for setting up raster tile sources
   */
  static async getTileJSON(tileset: GolfCourseTileset): Promise<any> {
    return {
      tilejson: '3.0.0',
      name: tileset.name,
      description: tileset.description,
      version: '1.0.0',
      scheme: 'xyz',
      tiles: [], // Will be populated dynamically with signed URLs
      minzoom: tileset.min_zoom,
      maxzoom: tileset.max_zoom,
      bounds: [
        tileset.min_lon,
        tileset.min_lat,
        tileset.max_lon,
        tileset.max_lat
      ],
      center: [tileset.center_lon, tileset.center_lat, tileset.default_zoom],
      attribution: tileset.attribution,
      format: tileset.format,
      tileSize: tileset.tile_size
    }
  }

  /**
   * Upload tileset metadata from JSON file
   */
  static async uploadTilesetMetadataFromJSON(
    golfClubId: string,
    jsonContent: string
  ): Promise<GolfCourseTileset | null> {
    try {
      const metadata = JSON.parse(jsonContent) as TilesetMetadata
      return await this.createTileset(golfClubId, metadata)
    } catch (error) {
      console.error('Failed to parse or upload tileset metadata:', error)
      return null
    }
  }
}

