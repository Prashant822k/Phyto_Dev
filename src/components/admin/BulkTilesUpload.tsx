import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { R2Service } from '@/lib/r2Service'

function toSafeCourse(name: string) {
  return name
    .toLowerCase()
    .replace(/\.{2,}/g, '')
    .replace(/[\/\_]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function BulkTilesUpload() {
  const { toast } = useToast()
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([])
  const [courseId, setCourseId] = useState<string>('')
  const [courseName, setCourseName] = useState<string>('')

  const [dirFiles, setDirFiles] = useState<FileList | null>(null)
  const [metaFile, setMetaFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [lastUploadReport, setLastUploadReport] = useState<{
    uploaded: number
    skipped: number
    errors: string[]
    durationMs: number
  } | null>(null)

  const hasSelection = useMemo(() => dirFiles && dirFiles.length > 0, [dirFiles])

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('golf_clubs').select('id, name').order('name')
      if (!error && data) setCourses(data as any)
    })()
  }, [])

  const onSelectCourse = (id: string) => {
    setCourseId(id)
    const found = courses.find(c => c.id === id)
    setCourseName(found?.name || '')
  }

  const upsertTileset = async (opts: {
    club_id: string
    name: string
    code: string
    minzoom?: number
    maxzoom?: number
    tileSize?: number
    center?: [number, number, number?]
    bounds?: [number, number, number, number]
    attribution?: string
  }) => {
    try {
      await supabase.from('golf_course_tilesets').upsert({
        club_id: opts.club_id,
        name: opts.name,
        code: opts.code,
        path_prefix: opts.code,
        minzoom: opts.minzoom ?? null,
        maxzoom: opts.maxzoom ?? null,
        tile_size: opts.tileSize ?? null,
        center: opts.center ?? null,
        bounds: opts.bounds ?? null,
        attribution: opts.attribution ?? null,
      }, { onConflict: 'club_id' })
    } catch {}
  }

  const uploadMetadataOnly = async () => {
    if (!courseId || !courseName) {
      toast({ title: 'Select a golf course', variant: 'destructive' })
      return
    }
    if (!metaFile) {
      toast({ title: 'Choose a metadata JSON', variant: 'destructive' })
      return
    }
    try {
      const key = `${toSafeCourse(courseName)}/metadata.json`
      const res = await R2Service.uploadFile(key, metaFile)
      if (!res.success) throw new Error('Upload failed')
      try {
        const text = await metaFile.text()
        const meta = JSON.parse(text)
        await upsertTileset({
          club_id: courseId,
          name: courseName,
          code: toSafeCourse(courseName),
          minzoom: typeof meta.minzoom === 'number' ? meta.minzoom : undefined,
          maxzoom: typeof meta.maxzoom === 'number' ? meta.maxzoom : undefined,
          tileSize: typeof meta.tileSize === 'number' ? meta.tileSize : undefined,
          center: Array.isArray(meta.center) ? meta.center : undefined,
          bounds: Array.isArray(meta.bounds) ? meta.bounds : undefined,
          attribution: typeof meta.attribution === 'string' ? meta.attribution : undefined,
        })
      } catch {}
      toast({ title: 'Metadata uploaded', description: key })
    } catch (e: any) {
      toast({ title: 'Metadata upload failed', description: e?.message || 'Unknown error', variant: 'destructive' })
    }
  }

  const uploadTilesFolder = async () => {
    if (!courseId || !courseName) {
      toast({ title: 'Select a golf course', variant: 'destructive' })
      return
    }
    if (!dirFiles || dirFiles.length === 0) {
      toast({ title: 'Choose a tile folder', description: 'Folder must contain files in z/x/y.png structure', variant: 'destructive' })
      return
    }

    // Validate auth + admin
    try {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) throw new Error('Not authenticated')
      const { data: me } = await supabase.from('users').select('role').eq('id', sess.session.user.id).single()
      if (me?.role !== 'admin') throw new Error('Only admins can upload')
    } catch (e: any) {
      toast({ title: 'Auth error', description: e?.message || 'Please log in', variant: 'destructive' })
      return
    }

    const safe = toSafeCourse(courseName)

    // Iterate files and upload only those matching */z/x/y.png in the chosen folder
    let uploaded = 0
    let skipped = 0
    const errors: string[] = []

    // Directory selection provides webkitRelativePath; preserve z/x/y from it
    const filesArr = Array.from(dirFiles)
    const started = Date.now()
    setIsUploading(true)
    try {
      for (const f of filesArr) {
        const rel = (f as any).webkitRelativePath as string | undefined
        const name = f.name
        // Try to derive z/x/y either from relative path or filename
        let z: string | null = null
        let x: string | null = null
        let y: string | null = null

        if (rel) {
          // Expect something like <folder>/<z>/<x>/<y>.png
          const parts = rel.split('/')
          // find a sequence looking like .../<z>/<x>/<y>.png
          for (let i = 0; i < parts.length - 2; i++) {
            const pz = parts[i]
            const px = parts[i + 1]
            const py = parts[i + 2]
            if (/^\d+$/.test(pz) && /^\d+$/.test(px) && /^(\d+).*\.png$/i.test(py)) {
              z = pz
              x = px
              y = py.replace(/\.png$/i, '').match(/^(\d+)/)?.[1] || null
              break
            }
          }
        }
        if (!z || !x || !y) {
          const base = name.replace(/\.png$/i, '')
          const m = base.match(/(\d+)[_-](\d+)[_-](\d+)$/)
          if (m) { z = m[1]; x = m[2]; y = m[3] }
        }

        if (!z || !x || !y) {
          skipped++
          errors.push(`Skipped ${name}: missing z/x/y (ensure folder path or name like z-x-y.png)`) 
          continue
        }

        const key = `${safe}/${z}/${x}/${y}.png`
        try {
          const res = await R2Service.uploadFile(key, f)
          if (!res.success) throw new Error('Edge function rejected the upload')
          uploaded++
        } catch (e: any) {
          skipped++
          errors.push(`Failed ${name} → ${key}: ${e?.message || 'unknown error'}`)
        }
      }
    } finally {
      const durationMs = Date.now() - started
      setIsUploading(false)
      setLastUploadReport({ uploaded, skipped, errors, durationMs })
      try {
        await upsertTileset({ club_id: courseId, name: courseName, code: safe })
      } catch {}
      toast({
        title: 'Tiles upload finished',
        description: `${courseName} — Uploaded ${uploaded}, Skipped ${skipped} in ${(durationMs/1000).toFixed(1)}s`,
      })
    }
  }

  // Helpers to compute lon/lat from tile x/y/z
  const tile2lon = (x: number, z: number) => (x / Math.pow(2, z)) * 360 - 180
  const tile2lat = (y: number, z: number) => {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  }

  // Generate metadata.json by scanning existing XYZ tiles in R2 for the selected course
  const generateMetadataFromTiles = async () => {
    if (!courseId || !courseName) { toast({ title: 'Select a golf course', variant: 'destructive' }); return }
    try {
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) throw new Error('Not authenticated')
    } catch (e: any) {
      toast({ title: 'Auth error', description: e?.message || 'Please log in', variant: 'destructive' })
      return
    }

    const safe = toSafeCourse(courseName)
    try {
      const { items } = await R2Service.list(`${safe}/`)
      const keys = (items || []).map((i: any) => i.key || i).filter(Boolean) as string[]
      // Extract z/x/y.png
      const matches = keys
        .map(k => {
          const m = k.match(new RegExp(`^${safe}/(\\d+)/(\\d+)/(\\d+)\\.png$`))
          if (!m) return null
          return { z: parseInt(m[1], 10), x: parseInt(m[2], 10), y: parseInt(m[3], 10) }
        })
        .filter(Boolean) as Array<{ z: number; x: number; y: number }>

      if (!matches.length) {
        toast({ title: 'No XYZ tiles found', description: 'Ensure tiles are stored as z/x/y.png', variant: 'destructive' })
        return
      }

      // Determine zoom range and bounds from all tiles
      const zooms = matches.map(m => m.z)
      const minzoom = Math.min(...zooms)
      const maxzoom = Math.max(...zooms)

      // Use maxzoom tiles to build bounds
      const atMax = matches.filter(m => m.z === maxzoom)
      const xs = atMax.map(m => m.x)
      const ys = atMax.map(m => m.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      // Convert tile indices to lon/lat bounds
      const minLon = tile2lon(minX, maxzoom)
      const maxLon = tile2lon(maxX + 1, maxzoom)
      const minLat = tile2lat(maxY + 1, maxzoom)
      const maxLat = tile2lat(minY, maxzoom)
      const centerLon = (minLon + maxLon) / 2
      const centerLat = (minLat + maxLat) / 2

      const metadata = {
        tilejson: '2.1.0',
        name: courseName,
        description: `Tileset for ${courseName}`,
        version: '1.0.0',
        scheme: 'xyz',
        minzoom,
        maxzoom,
        tileSize: 512,
        center: [Number(centerLon.toFixed(6)), Number(centerLat.toFixed(6)), maxzoom],
        bounds: [Number(minLon.toFixed(6)), Number(minLat.toFixed(6)), Number(maxLon.toFixed(6)), Number(maxLat.toFixed(6))],
        attribution: undefined,
      }

      const file = new File([new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' })], 'metadata.json', { type: 'application/json' })
      const key = `${safe}/metadata.json`
      const res = await R2Service.uploadFile(key, file as any)
      if (!(res as any).success) throw new Error('Upload failed')
      try {
        await upsertTileset({
          club_id: courseId,
          name: courseName,
          code: safe,
          minzoom,
          maxzoom,
          tileSize: 512,
          center: [Number(centerLon.toFixed(6)), Number(centerLat.toFixed(6)), maxzoom],
          bounds: [Number(minLon.toFixed(6)), Number(minLat.toFixed(6)), Number(maxLon.toFixed(6)), Number(maxLat.toFixed(6))],
        })
      } catch {}
      toast({ title: 'Generated metadata.json', description: key })
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e?.message || 'Unknown error', variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Bulk Upload Tiles with Metadata</CardTitle>
        <CardDescription>
          Upload your existing z/x/y.png tile folder structure with metadata.json
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Golf Course</Label>
          <Select value={courseId} onValueChange={onSelectCourse}>
            <SelectTrigger>
              <SelectValue placeholder={courses.length ? 'Select a golf course' : 'No courses found'} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tile Folder (z/x/y.png structure)</Label>
          {/* Use native input to support directory selection attributes */}
          <input
            type="file"
            multiple
            // @ts-ignore - non-standard webkitdirectory attribute used by Chromium-based browsers
            webkitdirectory="true"
            // @ts-ignore - non-standard directory attribute used by some browsers
            directory="true"
            onChange={(e) => setDirFiles(e.target.files)}
            className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">Select your tile folder - the structure (z/x/y.png) will be preserved in R2</p>
          <div className="flex gap-2">
            <Button onClick={uploadTilesFolder} disabled={!courseId || !hasSelection || isUploading}>
              {isUploading ? 'Uploading…' : 'Upload Tiles'}
            </Button>
          </div>
          {lastUploadReport && (
            <div className="mt-3 rounded-md border p-3 text-sm">
              <div className="font-medium">Result</div>
              <div className="text-muted-foreground">
                Uploaded {lastUploadReport.uploaded}, Skipped {lastUploadReport.skipped} in {(lastUploadReport.durationMs/1000).toFixed(1)}s
              </div>
              {lastUploadReport.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">View details ({lastUploadReport.errors.length})</summary>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {lastUploadReport.errors.slice(0, 50).map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                    {lastUploadReport.errors.length > 50 && (
                      <li>…and {lastUploadReport.errors.length - 50} more</li>
                    )}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Metadata JSON File</Label>
          <Input type="file" accept="application/json" onChange={(e) => setMetaFile(e.target.files?.[0] || null)} />
          <p className="text-xs text-muted-foreground">Upload metadata.json with bounds, center, and zoom info</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={uploadMetadataOnly} disabled={!courseId || !metaFile}>Create Tileset (Metadata Only)</Button>
            <Button onClick={generateMetadataFromTiles} variant="outline" disabled={!courseId}>Generate metadata.json from tiles</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
