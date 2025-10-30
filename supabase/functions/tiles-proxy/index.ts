// Deno Edge Function: tiles-proxy
// Verifies Supabase JWT, builds an R2 key for course/{golfCourse}/{z}/{x}/{y}.png, requests a signed GET URL from r2-sign, and streams the tile.
// Endpoint: /functions/v1/tiles-proxy?golfCourse=<name>&z=<z>&x=<x>&y=<y>

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const url = new URL(req.url)
    // Accept both query parameters and path-like patterns in the future
    const golfCourse = url.searchParams.get('golfCourse') || ''
    const z = url.searchParams.get('z') || ''
    const x = url.searchParams.get('x') || ''
    const y = url.searchParams.get('y') || ''

    if (!golfCourse || !z || !x || !y) {
      return new Response('Missing parameters', { status: 400, headers: corsHeaders })
    }

    // Accept JWT from Authorization header or from `token` query param (for environments that cannot set headers)
    const headerAuth = req.headers.get('Authorization') || ''
    const tokenParam = url.searchParams.get('token') || ''
    const auth = headerAuth || (tokenParam ? `Bearer ${tokenParam}` : '')
    if (!auth) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    // Build candidate R2 keys to support legacy and raw folder names
    const lower = golfCourse.toLowerCase()
    const safeCourse = lower
      .replace(/\.{2,}/g, '')
      .replace(/\//g, '-')
      .replace(/_/g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    const rawCourse = golfCourse
      .replace(/\.{2,}/g, '')
      .replace(/^\/+|\/+$/g, '')
    const singularSafe = safeCourse.endsWith('s') ? safeCourse.slice(0, -1) : safeCourse
    const singularRaw = rawCourse.endsWith('s') ? rawCourse.slice(0, -1) : rawCourse

    // Variants: remove common words and build acronym to match folders like "rcb"
    const COMMON_WORDS = ['golf', 'club', 'course']
    const words = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
    const trimmedWords = words.filter(w => !COMMON_WORDS.includes(w))
    const removedCommon = trimmedWords.join('-').replace(/-+/g, '-')
    const acronym = trimmedWords.map(w => w[0]).join('') // e.g., RCB

    const variants = Array.from(new Set([
      safeCourse,
      singularSafe,
      rawCourse,
      singularRaw,
      removedCommon,
      removedCommon.replace(/-/g, ''),
      acronym,
    ].filter(v => !!v && v !== '-' )))

    const candidates: string[] = []
    for (const v of variants) {
      candidates.push(`course/${v}/${z}/${x}/${y}.png`)
      candidates.push(`${v}/${z}/${x}/${y}.png`)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!supabaseUrl) return new Response('SUPABASE_URL missing', { status: 500, headers: corsHeaders })

    // Try candidates in order
    let tileResp: Response | null = null
    for (const key of candidates) {
      const signResp = await fetch(`${supabaseUrl}/functions/v1/r2-sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth,
        },
        body: JSON.stringify({ action: 'getGetUrl', key, expiresInSeconds: 900 }),
      })
      if (!signResp.ok) continue
      const { url: signedUrl } = await signResp.json()
      const tryResp = await fetch(signedUrl)
      if (tryResp.ok) { tileResp = tryResp; break }
    }
    if (!tileResp) return new Response('Tile not found', { status: 404, headers: corsHeaders })

    // Pass-through content
    const headers = new Headers(tileResp.headers)
    headers.set('Cache-Control', 'public, max-age=300')
    for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v)
    return new Response(tileResp.body, { status: 200, headers })
  } catch (e) {
    return new Response(`tiles-proxy error: ${e instanceof Error ? e.message : 'unknown'}`, { status: 500, headers: corsHeaders })
  }
})
