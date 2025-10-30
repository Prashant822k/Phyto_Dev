import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { R2Service } from '@/lib/r2Service'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import MapboxViewer, { RasterTileSource } from '@/components/MapboxViewer'

type UserProfile = {
  full_name?: string | null
  organization?: string | null
}

type TileRow = {
  id: string
  user_id: string
  tile_url: string
  latitude?: number | null
  longitude?: number | null
  zoom?: number | null
}

const DashboardClient = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tiles, setTiles] = useState<RasterTileSource[]>([])
  const [center, setCenter] = useState<[number, number] | undefined>(undefined)
  const [startZoom, setStartZoom] = useState<number | undefined>(undefined)
  const [hasDbTiles, setHasDbTiles] = useState<boolean>(false)
  const [opacity, setOpacity] = useState<number>(0.9)
  const [attribution, setAttribution] = useState<string | undefined>(undefined)
  const [title, setTitle] = useState<string | undefined>(undefined)
  const [subtitle, setSubtitle] = useState<string | undefined>(undefined)
  const [clubName, setClubName] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/login-client'
          return
        }

        // Fetch profile from users table
        const { data: userRow } = await supabase
          .from('users')
          .select('full_name, organization, club_id')
          .eq('id', user.id)
          .single()
        // Fallback to auth metadata if table row or fields are missing
        const meta = user.user_metadata || {}
        const resolvedFullName = userRow?.full_name ?? meta.full_name ?? null
        setProfile({ full_name: resolvedFullName, organization: userRow?.organization ?? meta.organization ?? null })

        // If users table is missing, upsert a minimal profile from metadata (best-effort)
        if (!userRow || !userRow.full_name || !userRow.organization) {
          try {
            await supabase
              .from('users')
              .upsert({
                id: user.id,
                email: user.email,
                full_name: resolvedFullName,
                organization: userRow?.organization ?? meta.organization ?? null,
                role: 'client'
              }, { onConflict: 'id' })
          } catch {
            // Ignore failures due to RLS; UI already has metadata fallback
          }
        }

        // Determine club and course source configuration
        let course: string | undefined
        let tileset: any | null = null
        if (userRow?.club_id) {
          const { data: club } = await supabase.from('golf_clubs').select('name').eq('id', userRow.club_id).single()
          course = club?.name || undefined
          if (course) setClubName(course)
          const { data: ts } = await supabase.from('golf_course_tilesets').select('code, name, minzoom, maxzoom, tile_size, center, bounds, attribution').eq('club_id', userRow.club_id).single()
          tileset = ts || null
        } else {
          course = (userRow?.organization || meta.organization) as string | undefined
          if (course) setClubName(course)
        }

        if ((course || tileset) && import.meta.env.VITE_SUPABASE_URL) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token
          const tokenParam = token ? `&token=${encodeURIComponent(token)}` : ''
          const courseKey = (tileset?.code as string | undefined) || (course as string)
          const proxyUrl = `${supabaseUrl}/functions/v1/tiles-proxy?golfCourse=${encodeURIComponent(courseKey)}&z={z}&x={x}&y={y}${tokenParam}`
          // Try to load metadata.json from R2 via signed URL
          const toSafe = (name: string) => name
            .toLowerCase()
            .replace(/\.{2,}/g, '')
            .replace(/[\/\_]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')

          const safe = toSafe(courseKey)
          const metadataKeyCandidates = [
            `${safe}/metadata.json`,
            `course/${safe}/metadata.json`,
            `${courseKey}/metadata.json`,
          ]

          let meta: any | null = tileset ? {
            tileSize: typeof tileset.tile_size === 'number' ? tileset.tile_size : undefined,
            minzoom: typeof tileset.minzoom === 'number' ? tileset.minzoom : undefined,
            maxzoom: typeof tileset.maxzoom === 'number' ? tileset.maxzoom : undefined,
            center: Array.isArray(tileset.center) ? tileset.center : undefined,
            bounds: Array.isArray(tileset.bounds) ? tileset.bounds : undefined,
            name: tileset.name || courseKey,
            attribution: tileset.attribution || undefined,
          } : null
          for (const key of metadataKeyCandidates) {
            try {
              const { url } = await R2Service.getGetUrl(key)
              const resp = await fetch(url)
              if (resp.ok) {
                meta = await resp.json()
                break
              }
            } catch {}
          }

          // Apply metadata if available
          if (meta) {
            const tileSize = typeof meta.tileSize === 'number' ? meta.tileSize : 512
            const minzoom = typeof meta.minzoom === 'number' ? meta.minzoom : 0
            const maxzoom = typeof meta.maxzoom === 'number' ? meta.maxzoom : 22
            setTitle(typeof meta.name === 'string' ? meta.name : courseKey)
            setSubtitle(typeof meta.description === 'string' ? meta.description : undefined)
            setAttribution(typeof meta.attribution === 'string' ? meta.attribution : undefined)
            setHasDbTiles(true)
            // Prefer center [lon, lat, zoom]
            if (Array.isArray(meta.center) && meta.center.length >= 2) {
              const [lon, lat] = meta.center
              const zVal = meta.center[2]
              setCenter([Number(lon), Number(lat)])
              if (typeof zVal === 'number') setStartZoom(zVal)
            } else if (Array.isArray(meta.bounds) && meta.bounds.length === 4) {
              // Use bounds [minLon, minLat, maxLon, maxLat] to set approximate center
              const [minLon, minLat, maxLon, maxLat] = meta.bounds.map((n: any) => Number(n))
              const cenLon = (minLon + maxLon) / 2
              const cenLat = (minLat + maxLat) / 2
              setCenter([cenLon, cenLat])
              setStartZoom(z => z ?? 14)
            } else {
              setCenter(center => center ?? [0, 0])
              setStartZoom(z => z ?? 3)
            }
            setTiles([{ id: `course-${courseKey}`, tile_url: proxyUrl, minzoom, maxzoom, tileSize }])
          } else {
            // No metadata found; use sensible defaults
            setTitle(courseKey)
            setSubtitle(undefined)
            setAttribution(undefined)
            setHasDbTiles(false)
            setCenter(center => center ?? [0, 0])
            setStartZoom(z => z ?? 3)
            setTiles([{ id: `course-${courseKey}`, tile_url: proxyUrl, minzoom: 0, maxzoom: 22, tileSize: 512 }])
          }
        } else {
          setTiles([])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login-client'
  }

  const displayName = profile?.full_name || 'Client'
  const courseName = clubName || profile?.organization || '—'

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar with user details */}
      <div className="w-full border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Welcome, {displayName}</h1>
            <p className="text-sm text-muted-foreground">Golf Course: {courseName}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading map...</div>
            ) : tiles.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">No map source configured.</div>
            ) : (
              <div className="space-y-3">
                {!hasDbTiles && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    No tile metadata found for this course; showing overlay if tiles exist in storage. Add metadata in Admin → Upload Tileset Metadata for better centering.
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    {title && <h2 className="text-lg font-medium">{title}</h2>}
                    {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm flex items-center gap-2">
                      <input type="checkbox" checked={opacity > 0} onChange={(e) => setOpacity(e.target.checked ? 0.9 : 0)} />
                      Show Overlay
                    </label>
                  </div>
                </div>
                <MapboxViewer tiles={tiles} center={center} zoom={startZoom} opacity={opacity} attribution={attribution} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardClient
