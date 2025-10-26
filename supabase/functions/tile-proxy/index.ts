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
    const courseId = url.searchParams.get('courseId')
    const z = url.searchParams.get('z')
    const x = url.searchParams.get('x')
    const y = url.searchParams.get('y')
    const token = url.searchParams.get('token')

    if (!courseId || !z || !x || !y || !token) {
      return new Response('Missing parameters', { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      })
    }

    const key = `${courseId}/tiles/${z}/${x}/${y}.png`
    console.log('Fetching tile:', key)

    // Call r2-sign function to get tile with authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
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
      console.error('Tile fetch failed:', tileResponse.status, await tileResponse.text())
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

