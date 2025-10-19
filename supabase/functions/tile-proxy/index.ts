import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { S3Client, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.621.0"
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.621.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize R2 client
const r2Client = new S3Client({
  region: Deno.env.get('CLOUDFLARE_R2_REGION') || 'auto',
  endpoint: `https://${Deno.env.get('CLOUDFLARE_R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID') || '',
    secretAccessKey: Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') || '',
  },
})

const BUCKET_NAME = Deno.env.get('CLOUDFLARE_R2_BUCKET_NAME') || 'map-stats-tiles-prod'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

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

    // Get the tile from R2
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: tilePath,
    })

    // Generate a signed URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 })

    // Fetch the actual tile
    const tileResponse = await fetch(signedUrl)
    
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

