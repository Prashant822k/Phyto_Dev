import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// R2 Public URL - If your bucket has public access
// Otherwise, you'll need to use R2's public domain or custom domain
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL') || ''
const BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME') || 'map-stats-tiles-prod'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Note: This function is intentionally public to serve map tiles
  // No authentication required for tile serving
  
  try {
    // Extract tile path from URL
    // Expected format: /tile-proxy/{golf-course-name}/tiles/{z}/{x}/{y}.png
    const url = new URL(req.url)
    const pathMatch = url.pathname.match(/^\/tile-proxy\/(.+)$/)
    
    if (!pathMatch) {
      return new Response('Invalid tile path', { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      })
    }

    const tilePath = pathMatch[1]
    
    console.log('Fetching tile:', tilePath)

    // Construct R2 URL
    // For now, using public R2 URL format
    // Format: https://pub-<hash>.r2.dev/<path>
    const r2Url = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${tilePath}`
      : `https://${BUCKET_NAME}.r2.dev/${tilePath}`

    console.log('Fetching from R2:', r2Url)

    // Fetch the actual tile
    const tileResponse = await fetch(r2Url)
    
    if (!tileResponse.ok) {
      console.error('Tile not found:', tilePath)
      // Return transparent 1x1 PNG for missing tiles
      const transparentPng = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), c => c.charCodeAt(0))
      return new Response(transparentPng, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        }
      })
    }

    const tileData = await tileResponse.arrayBuffer()

    // Determine content type based on file extension
    const extension = tilePath.split('.').pop()?.toLowerCase()
    let contentType = 'image/png'
    if (extension === 'jpg' || extension === 'jpeg') {
      contentType = 'image/jpeg'
    } else if (extension === 'webp') {
      contentType = 'image/webp'
    }

    return new Response(tileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Max-Age': '86400',
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

