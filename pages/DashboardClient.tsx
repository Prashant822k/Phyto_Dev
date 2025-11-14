import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { sanitizeGolfCourseName } from '@/lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ImageService } from '@/lib/imageService'
import MapboxGolfCourseMap from '@/components/MapboxGolfCourseMap'
import OverlaysSidebar from '@/components/OverlaysSidebar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Image as ImageIcon, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DashboardClient = () => {
  const [images, setImages] = useState<Array<any>>([])
  const [golfClubId, setGolfClubId] = useState<string | null>(null)
  const [golfClubName, setGolfClubName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [active, setActive] = useState<Record<string, { key: string; type: 'tile' | 'geojson'; url: string; meta?: any }>>({})
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [overlayState, setOverlayState] = useState<Record<string, boolean>>({})
  const [overlayOrder, setOverlayOrder] = useState<string[]>([])
  const [overlayDefs, setOverlayDefs] = useState<Array<{ id: string; name: string; key: string }>>([])
  const [baseFolder, setBaseFolder] = useState<string>('')

  // Requested fixed categories in desired order
  const CATEGORY_ORDER: Array<{ id: string; name: string; synonyms: string[] }> = [
    { id: 'building', name: 'Building', synonyms: ['building', 'buildings'] },
    { id: 'course_building', name: 'Course Building', synonyms: ['course_building', 'course-building', 'coursebuilding'] },
    { id: 'heathland', name: 'Heathland', synonyms: ['heathland', 'heath_land'] },
    { id: 'open_sand', name: 'Open Sand', synonyms: ['open_sand', 'opensand', 'sand'] },
    { id: 'open_water', name: 'Open Water', synonyms: ['open_water', 'openwater', 'water'] },
    { id: 'holes', name: 'Holes', synonyms: ['holes', 'golf_holes', 'course_holes'] },
    { id: 'wetland_and_shrubs', name: 'Wetland and Shrubs', synonyms: ['wetland_and_shrubs', 'wetland_shrubs', 'wetland', 'shrubs'] },
    { id: 'woodland', name: 'Woodland', synonyms: ['woodland', 'woods', 'forest'] },
  ]

  // Preferred filenames in R2 per category (based on your folder listing)
  const PREFERRED_FILENAMES: Record<string, string[]> = {
    building: ['Buildings.geojson', 'Building.geojson'],
    course_building: ['Course_boundary.geojson'],
    heathland: ['Heathland.geojson'],
    open_sand: ['Open Sand.geojson', 'Open_Sand.geojson'],
    open_water: ['Open Water.geojson', 'Open_Water.geojson'],
    holes: ['par 72 holes.geojson', 'par 27 holes.geojson'],
    wetland_and_shrubs: ['Wetland & shrubs.geojson', 'Wetland_and_shrubs.geojson', 'Wetland shrubs.geojson'],
    woodland: ['Woodland.geojson']
  }

  useEffect(() => {
    // initialize order whenever defs change and order is empty
    if (!overlayOrder.length && overlayDefs.length) setOverlayOrder(overlayDefs.map(d=>d.id))
  }, [overlayDefs, overlayOrder.length])

  // Fetch overlays for user's club from all course folders linked to this club
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || !golfClubId) return

        // Get all tilesets for this club to discover existing course folders
        const { data: tilesets } = await supabase
          .from('golf_course_tilesets')
          .select('r2_folder_path, overlays')
          .eq('golf_club_id', golfClubId)

        const foldersFromTilesets: string[] = (tilesets || [])
          .map(t => (t as any).r2_folder_path as string)
          .filter(Boolean)
          .map(p => p.split('/tiles')[0])

        // Choose baseFolder preference: tileset-derived > sanitized club name > golfClubId
        const fallbackName = sanitizeGolfCourseName(golfClubName || '')
        const preferredBase = foldersFromTilesets[0] || fallbackName || String(golfClubId || '')
        setBaseFolder(preferredBase)
        // Build discovery folders: prefer tileset-derived; if none, use preferredBase only
        const folders = foldersFromTilesets.length ? foldersFromTilesets : [preferredBase]

        // If overlays JSON exists in any tileset rows, prefer that mapping
        const overlayMappedDefs: Array<{ id: string; name: string; key: string }> = []
        for (const t of (tilesets || [])) {
          const folder = String((t as any).r2_folder_path || '').split('/tiles')[0]
          const overlays = (t as any).overlays || null
          if (overlays && typeof overlays === 'object') {
            Object.entries(overlays as Record<string, string>).forEach(([cat, key]) => {
              if (!key) return
              const filename = String(key).split('/').pop() || String(key)
              const name = filename.replace(/_/g, ' ').replace(/\.geojson$/i, '')
              overlayMappedDefs.push({ id: `cat:${cat}`, name, key: key as string })
            })
          }
        }

        // List .geojson/.json under each <folder>/geojson/ and legacy <folder>/tiles/ (fallback to discovery)
        const allDefs: Array<{ id: string; name: string; key: string }> = [...overlayMappedDefs]
        for (const folder of folders) {
          try { console.log('Discovering overlays under folder', folder) } catch {}
          const prefixes = [`${folder}/geojson/`, `${folder}/tiles/`]
          for (const prefix of prefixes) {
            try {
              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ action: 'listObjects', prefix })
              })
              const data = await res.json()
              const raw = data.items || []
              const items: string[] = Array.isArray(raw)
                ? raw.map((it: any) => typeof it === 'string' ? it : (it?.Key || it?.key || ''))
                    .filter((k: string) => !!k)
                : []
              const defs = items.filter((k: string)=>/\.(geo)?json$/i.test(k)).map((k: string) => {
                const filename = k.split('/').pop() || k
                const base = (filename || '').toLowerCase().replace(/\.(geo)?json$/i,'')
                const name = filename.replace(/_/g, ' ')
                const id = `${folder}:${base}`
                return { id, name, key: k }
              })
              allDefs.push(...defs)
            } catch {}
          }
        }
        // Try to map discovered files to requested categories by filename base
        const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
        const withBase = allDefs.map(d => ({ def: d, base: normalized(d.id.split(':').pop() || '') }))

        const categoryDefs: Array<{ id: string; name: string; key: string }> = overlayMappedDefs.length ? overlayMappedDefs.slice() : []
        const usedKeys = new Set<string>()
        for (const cat of CATEGORY_ORDER) {
          const tokens = cat.synonyms.map(normalized)
          const candidates = overlayMappedDefs.length
            ? []
            : withBase.filter(({ def, base }) => {
                if (usedKeys.has(def.key)) return false
                return tokens.some(t => base === t || base.includes(t))
              })
          let pick = candidates[0] || null
          // Prefer par 72 over par 27 for holes if both exist
          if (cat.id === 'holes' && candidates.length > 1) {
            const has72 = candidates.find(c => /72/.test(c.def.name || c.def.id || c.base))
            pick = has72 || candidates[0]
          }
          if (pick) {
            usedKeys.add(pick.def.key)
            categoryDefs.push({ id: `cat:${cat.id}`, name: cat.name, key: pick.def.key })
          }
        }

        // Final list: categories (in order) that exist, then any remaining files
        const remaining = allDefs.filter(d => !usedKeys.has(d.key) && !categoryDefs.some(c=>c.key===d.key))
        const finalDefs = [...categoryDefs, ...remaining]
        setOverlayDefs(finalDefs)

        // Persist overlays mapping so toggles link to exact keys immediately
        try {
          const overlays: Record<string, string> = {}
          for (const c of categoryDefs) {
            if (!c.id.startsWith('cat:')) continue
            const catId = c.id.slice(4)
            overlays[catId] = c.key
          }
          if (Object.keys(overlays).length && golfClubId) {
            const { data } = await supabase
              .from('golf_course_tilesets')
              .select('id')
              .eq('golf_club_id', golfClubId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (data?.id) {
              await supabase.from('golf_course_tilesets').update({ overlays }).eq('id', data.id)
            }
          }
        } catch {}
      } catch {}
    })()
  }, [golfClubId])

  const toggleOverlay = (id: string, on: boolean) => {
    setOverlayState(prev => ({ ...prev, [id]: on }))
    // Resolve overlay definition; if a direct category entry isn't present, try to find a best match by filename using synonyms
    const resolveDef = (): { id: string; name: string; key: string } | undefined => {
      const direct = overlayDefs.find(d => d.id === id)
      if (direct) return direct
      if (id.startsWith('cat:')) {
        const catId = id.slice(4)
        const cat = CATEGORY_ORDER.find(c => c.id === catId)
        if (cat) {
          // Prefer exact filename(s) if present in R2 (we'll try to sign them in order)
          if (baseFolder && PREFERRED_FILENAMES[cat.id]?.length) {
            const first = `${baseFolder}/geojson/${PREFERRED_FILENAMES[cat.id][0]}`
            return { id: `cat:${cat.id}`, name: cat.name, key: first }
          }
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
          const candidate = overlayDefs.find(d => {
            const filename = d.key.split('/').pop() || d.key
            const base = filename.replace(/\.(geo)?json$/i,'')
            const b = norm(base)
            return cat.synonyms.some(sym => b.includes(norm(sym)))
          })
          if (candidate) return { id: `cat:${cat.id}`, name: cat.name, key: candidate.key }
          // Hard fallback for Buildings when not discovered
          if ((cat.id === 'building' || cat.id === 'buildings') && baseFolder) {
            // Try common filename variants
            const variants = [
              `${baseFolder}/geojson/Buildings.geojson`,
              `${baseFolder}/geojson/Building.geojson`,
              `${baseFolder}/geojson/buildings.geojson`,
              `${baseFolder}/geojson/building.geojson`
            ]
            // Return first variant; downstream will try each until one signs successfully
            return { id: `cat:${cat.id}`, name: cat.name, key: variants[0] }
          }
        }
      }
      return undefined
    }
    const def = resolveDef()
    if (!def) return
    const key = `overlay:${id}`
    if (on) {
      ;(async () => {
        try {
          console.log('Overlay toggle ON: resolving definition', { id, resolved: def, baseFolder })
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return
          // Get a signed GET URL for this object
          const tryKeys = (() => {
            if (id.startsWith('cat:')) {
              const catId = id.slice(4)
              const base = baseFolder || ''
              const preferred = (PREFERRED_FILENAMES[catId] || []).map(fname => `${base}/geojson/${fname}`)
              // Prepend known public URLs when available
              if (catId === 'open_water') {
                const publicUrl = 'https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test12/geojson/Open%20Water.geojson'
                preferred.unshift(publicUrl)
              }
              if (catId === 'building' || catId === 'buildings') {
                const publicUrlB = 'https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test12/geojson/Buildings.geojson'
                preferred.unshift(publicUrlB)
              }
              if (catId === 'course_building') {
                const url = 'https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test12/geojson/Course_boundary.geojson'
                preferred.unshift(url)
              }
              if (catId === 'heathland') {
                const url = 'https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test12/geojson/Heathland.geojson'
                preferred.unshift(url)
              }
              if (catId === 'open_sand') {
                const url = 'https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test12/geojson/Open%20Sand.geojson'
                preferred.unshift(url)
              }
              if (catId === 'holes') {
                const url72 = 'https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test12/geojson/par%2072%20holes.geojson'
                const url27 = 'https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test12/geojson/par%2027%20holes.geojson'
                preferred.unshift(url27)
                preferred.unshift(url72)
              }
              if (catId === 'wetland_and_shrubs') {
                const url = 'https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test12/geojson/Wetland%20%26%20shrubs.geojson'
                preferred.unshift(url)
              }
              if (catId === 'woodland') {
                const url = 'https://pub-9cb97b1482d04e95afc343b2b255c0ee.r2.dev/test12/geojson/Woodland.geojson'
                preferred.unshift(url)
              }
              // Always include resolved key last to avoid duplicates
              const list = [...preferred, def.key]
              // De-dup
              return Array.from(new Set(list))
            }
            return [def.key]
          })()
          let url = ''
          let usedKey = ''
          for (const k of tryKeys) {
            try {
              console.log('Requesting signed URL for overlay key', { key: k })
              // If k is already a full URL, bypass signing and use directly
              if (/^https?:\/\//i.test(k)) { url = k; usedKey = k; break }
              const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ action: 'getGetUrl', key: k })
              })
              console.log('Signed URL response status', res.status, 'for key', k)
              const data = await res.json()
              if (data?.url) { url = data.url; usedKey = k; break }
            } catch (e) { console.warn('Signed URL attempt failed', { key: k }, e) }
          }
          if (!url) {
            console.error('No signed URL returned for any overlay key variants', { tryKeys })
            return
          }
          // Fetch GeoJSON content so map can consume object data directly
          let gj: any = null
          try {
            console.log('Fetching overlay GeoJSON from signed URL', { url })
            const gjRes = await fetch(url)
            console.log('GeoJSON fetch response status', gjRes.status)
            gj = await gjRes.json()
          } catch (e) { console.error('Failed to fetch/parse overlay GeoJSON', { id, url, usedKey }, e) }
          if (!gj) {
            console.warn('GeoJSON not parsed; activating overlay with URL so Mapbox fetches it directly', { id, usedKey })
            setActive(prev => ({ ...prev, [key]: { key, type: 'geojson', url } }))
          } else {
            setActive(prev => ({ ...prev, [key]: { key, type: 'geojson', url, meta: { geojson: gj } } }))
          }
          // After setting, also compute centroid and dispatch tileset switch
          try {
            const coords: number[][] = []
            const collect = (geom: any) => {
              const t = geom?.type
              const c = geom?.coordinates
              if (!t || !c) return
              const walk = (arr: any) => {
                if (!Array.isArray(arr)) return
                if (arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number' && isFinite(arr[0]) && isFinite(arr[1])) {
                  // CRS84 is [lon, lat]
                  coords.push([arr[0], arr[1]])
                  return
                }
                for (const el of arr) walk(el)
              }
              walk(c)
            }
            const src = gj
            if (src) {
              if (src.type === 'FeatureCollection') src.features.forEach((f: any) => collect(f.geometry))
              else if (src.type === 'Feature') collect(src.geometry)
              else collect(src)
            }
            if (coords.length) {
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
              coords.forEach(([x,y]) => { if (x<minX) minX=x; if (y<minY) minY=y; if (x>maxX) maxX=x; if (y>maxY) maxY=y; })
              // Expand zero-area bbox slightly so fitBounds can work
              const eps = 1e-6
              if (minX === maxX) { minX -= eps; maxX += eps }
              if (minY === maxY) { minY -= eps; maxY += eps }
              const lat = (minY + maxY) / 2
              const lon = (minX + maxX) / 2
              console.log('Overlay bbox computed', { id, minX, minY, maxX, maxY, centroid: [lon, lat], points: coords.length })
              // Fit to this overlay's bbox directly (no tileset switch dependency)
              setTimeout(() => {
                console.log('Dispatch zoom-to-bbox', [minX, minY, maxX, maxY])
                window.dispatchEvent(new CustomEvent('zoom-to-bbox', { detail: [minX, minY, maxX, maxY] }))
              }, 400)
            }
          } catch (e) { console.error('Failed to compute bbox/dispatch events', e) }

        } catch {}
      })()
    } else {
      setActive(prev => { const n = { ...prev }; delete n[key]; return n })
    }
  }

  // Synthetic folder so OverlaysSidebar treats items as available
  const overlayFolder = {
    project: 'ClientOverlays',
    date_time: 'Overlays',
    urlBase: '',
    metadata: {
      project: 'ClientOverlays',
      date: 'N/A',
      time: 'N/A',
      flight_id: 'N/A',
      uploader: 'system',
      bbox: [0,0,0,0] as [number, number, number, number],
      layers: overlayDefs.map(d => ({ id: d.id, name: d.name, type: 'geojson' as const, path: d.key }))
    }
  }

  // Map active overlays to OverlaysSidebar expected keys (date_time:layerId)
  const activeForSidebar: Record<string, { key: string; type: 'tile' | 'geojson'; url: string; meta?: any }> = {}
  Object.keys(overlayState).forEach(id => {
    if (!overlayState[id]) return
    const k = `overlay:${id}`
    const entry = active[k]
    if (entry) {
      activeForSidebar[`${overlayFolder.date_time}:${id}`] = entry
    }
  })

  // Always show requested categories as placeholders so toggles appear even before files exist
  const placeholderExtras: Array<{ id: string; name: string; type: 'tile' | 'geojson' }> = CATEGORY_ORDER.map(c => ({ id: `cat:${c.id}`, name: c.name, type: 'geojson' }))
  // Do not duplicate items that already exist in overlayDefs
  const existingIds = new Set(overlayDefs.map(d => d.id))
  const extraOverlays = placeholderExtras.filter(e => !existingIds.has(e.id))

  const onSidebarToggle = (_folder: any, layerId: string) => {
    const current = !!overlayState[layerId]
    toggleOverlay(layerId, !current)
  }

  const onReorder = (ids: string[]) => {
    setOverlayOrder(ids)
  }

  const load = async () => {
    setLoading(true)
    try {
      // Get current user and their golf club
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's profile to find their club_id
      const { data: profile } = await supabase
        .from('users')
        .select('club_id, golf_clubs(id, name)')
        .eq('id', user.id)
        .single()

      if (profile?.club_id) {
        setGolfClubId(profile.club_id)
        // @ts-ignore - golf_clubs is joined data
        setGolfClubName(profile.golf_clubs?.name || '')
      }

      // Fetch images - only show images uploaded by the current user
      // (clients shouldn't see other users' images)
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (!error && data) setImages(data)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Overlay sidebar should only open when user presses the Overlays button.

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome to {golfClubName || 'Your Golf Course'}</h1>
          <p className="text-muted-foreground mt-1">
            View your course map and processed imagery
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" className="rounded-full" onClick={() => setSidebarOpen(v => !v)}>
          <Layers className="w-4 h-4 mr-1" /> Overlays
        </Button>
      </div>

      {/* Golf Course Map */}
      {golfClubId && mapboxToken ? (
        <MapboxGolfCourseMap
          golfClubId={golfClubId}
          mapboxAccessToken={mapboxToken}
          showControls={true}
          className="w-full"
          activeLayers={active}
          navControlPosition="bottom-left"
          overlayOrder={overlayOrder}
        />
      ) : (
        <Card>
          <CardContent className="p-8">
            <Alert>
              <MapPin className="h-4 w-4" />
              <AlertDescription>
                {!mapboxToken ? (
                  <>
                    <strong>Mapbox token not configured.</strong>
                    <br />
                    Please add VITE_MAPBOX_ACCESS_TOKEN to your .env file.
                  </>
                ) : (
                  <>
                    <strong>No golf course assigned.</strong>
                    <br />
                    Please contact your administrator to assign you to a golf course.
                  </>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <OverlaysSidebar
        folders={[overlayFolder] as any}
        active={activeForSidebar}
        onToggle={onSidebarToggle}
        disabled={false}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        extraOverlays={extraOverlays}
        order={overlayOrder}
        onReorder={onReorder}
        checkedMap={overlayState}
      />

      {/* Processed Images Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Processed Imagery
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading images...
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((img) => (
                <ClientImageTile key={img.id} image={img} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No processed images yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const ClientImageTile = ({ image }: { image: any }) => {
  const [url, setUrl] = useState('')
  useEffect(() => {
    (async () => {
      const u = await ImageService.getImageUrl(image)
      setUrl(u)
    })()
  }, [image])
  return (
    <div className="border rounded">
      {url ? (<img src={url} className="w-full h-auto" />) : <div className="p-6 text-sm text-muted-foreground">Loading...</div>}
    </div>
  )
}

export default DashboardClient


