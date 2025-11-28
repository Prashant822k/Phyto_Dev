import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Secure tile serving with authentication
  
  try {
    const url = new URL(req.url)
    const tilesetId = url.searchParams.get('tilesetId')
    const z = url.searchParams.get('z')
    const x = url.searchParams.get('x')
    const y = url.searchParams.get('y')
    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type') || 'regular' // 'regular' or 'health'

    if (!tilesetId || !z || !x || !y || !token) {
      console.error('Missing parameters:', { tilesetId, z, x, y, hasToken: !!token })
      return new Response(JSON.stringify({ 
        error: 'Missing parameters',
        params: { tilesetId, z, x, y, hasToken: !!token }
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get tileset metadata to construct the correct R2 path
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let tileset, tilesetError
    
    if (type === 'health') {
      // Get health map tileset
      const result = await supabase
        .from('health_map_tilesets')
        .select('r2_folder_path, tile_url_pattern')
        .eq('id', tilesetId)
        .single()
      tileset = result.data
      tilesetError = result.error
    } else {
      // Get regular tileset
      const result = await supabase
        .from('golf_course_tilesets')
        .select('r2_folder_path, tile_url_pattern')
        .eq('id', tilesetId)
        .single()
      tileset = result.data
      tilesetError = result.error
    }

    if (tilesetError || !tileset) {
      console.error('Tileset not found:', tilesetId, type, tilesetError)
      return new Response(JSON.stringify({ 
        error: 'Tileset not found',
        tilesetId,
        type,
        details: tilesetError
      }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Construct the key using r2_folder_path and tile_url_pattern
    // r2_folder_path: "course-name/2024-11-03/14-30/tiles" or "course-name/tiles"
    // tile_url_pattern: "{z}/{x}/{y}.png"
    const tilePattern = tileset.tile_url_pattern
      .replace('{z}', z)
      .replace('{x}', x)
      .replace('{y}', y)
    
    const key = `${tileset.r2_folder_path}/${tilePattern}`
    console.log('tile-proxy - Fetching tile:', key)
    console.log('tile-proxy - r2_folder_path:', tileset.r2_folder_path)
    console.log('tile-proxy - tile_url_pattern:', tileset.tile_url_pattern)
    console.log('tile-proxy - z/x/y:', z, x, y)

    // Call r2-sign function to get tile with authentication
    const r2SignUrl = `${supabaseUrl}/functions/v1/r2-sign`

    const tileResponse = await fetch(r2SignUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getTile',
        key,
      }),
    })

    if (!tileResponse.ok) {
      const errorText = await tileResponse.text()
      console.error('tile-proxy - Tile fetch failed:', tileResponse.status, errorText)
      console.error('tile-proxy - Request key:', key)
      console.error('tile-proxy - r2_folder_path:', tileset.r2_folder_path)
      // Return transparent 1x1 PNG for missing/unauthorized tiles
      const transparentPng = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), c => c.charCodeAt(0))
      return new Response(transparentPng, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=60',
        }
      })
    }

    // r2-sign already returns the tile image
    const tileData = await tileResponse.arrayBuffer()

    return new Response(tileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('Tile proxy error:', error)
    
    // Return transparent 1x1 PNG for errors
    const transparentPng = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), c => c.charCodeAt(0))
    
    return new Response(transparentPng, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
      }
    })
  }
})

