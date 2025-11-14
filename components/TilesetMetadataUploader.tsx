import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TilesetService } from '@/lib/tilesetService'
import { Progress } from '@/components/ui/progress'
import { R2Service } from '@/lib/r2Service'
import { sanitizeGolfCourseName } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Upload, FileJson, CheckCircle, AlertCircle, Map } from 'lucide-react'

interface GolfClub {
  id: string
  name: string
}

interface TilesetMetadataUploaderProps {
  golfClubs: GolfClub[]
  onSuccess?: () => void
}

const TilesetMetadataUploader = ({ golfClubs, onSuccess }: TilesetMetadataUploaderProps) => {
  const [selectedClubId, setSelectedClubId] = useState<string>('')
  const [metadataJson, setMetadataJson] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isGeoJSONFile, setIsGeoJSONFile] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [parsedItems, setParsedItems] = useState<Array<{ file: File; isGeo: boolean; metadata: any }>>([])

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setSelectedFiles(files)

    // helper to read file as text
    const readFile = (f: File) => new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = e => resolve((e.target?.result as string) || '')
      r.onerror = reject
      r.readAsText(f)
    })

    ;(async () => {
      const items: Array<{ file: File; isGeo: boolean; metadata: any }> = []
      try {
        for (const file of files) {
          const content = await readFile(file)
          const parsed = JSON.parse(content)
          const lowerName = file.name.toLowerCase()
          const isGeoJSON = lowerName.endsWith('.geojson') || (
            parsed && typeof parsed === 'object' && (
              parsed.type === 'FeatureCollection' ||
              parsed.type === 'Feature' ||
              parsed.type === 'GeometryCollection'
            )
          )

          if (isGeoJSON) {
            const computeBBox = (geom: any): [number, number, number, number] => {
              const update = (bbox: [number, number, number, number], coords: any): [number, number, number, number] => {
                if (typeof coords[0] === 'number') {
                  const [lon, lat] = coords as [number, number]
                  return [
                    Math.min(bbox[0], lon),
                    Math.min(bbox[1], lat),
                    Math.max(bbox[2], lon),
                    Math.max(bbox[3], lat)
                  ]
                }
                for (const c of coords) bbox = update(bbox, c)
                return bbox
              }
              let bbox: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
              const walkGeometry = (g: any) => {
                if (!g) return
                const t = g.type
                if (t === 'GeometryCollection') {
                  for (const gg of g.geometries || []) walkGeometry(gg)
                  return
                }
                if (g.coordinates) bbox = update(bbox, g.coordinates)
              }
              const walk = (geo: any) => {
                if (!geo) return
                const t = geo.type
                if (t === 'FeatureCollection') for (const f of geo.features || []) walk(f)
                else if (t === 'Feature') walkGeometry(geo.geometry)
                else walkGeometry(geo)
              }
              if (Array.isArray(geom?.bbox) && geom.bbox.length === 4) return [geom.bbox[0], geom.bbox[1], geom.bbox[2], geom.bbox[3]]
              walk(geom)
              if (bbox[0] === Infinity) throw new Error('Unable to compute bounds from GeoJSON')
              return bbox
            }

            const [minLon, minLat, maxLon, maxLat] = computeBBox(parsed)
            const centerLon = (minLon + maxLon) / 2
            const centerLat = (minLat + maxLat) / 2
            const baseName = (parsed.name || (parsed.properties && parsed.properties.name) || file.name.replace(/\.[^.]+$/, '')).toString()

            const converted = {
              name: baseName,
              description: parsed.description || undefined,
              bounds: [minLon, minLat, maxLon, maxLat],
              center: [centerLon, centerLat, 17],
              minzoom: 14,
              maxzoom: 20,
              tileSize: 256
            }
            items.push({ file, isGeo: true, metadata: converted })
          } else {
            items.push({ file, isGeo: false, metadata: parsed })
          }
        }

        setParsedItems(items)
        // Keep backward compat preview: show first metadata in editor
        if (items[0]) {
          setSelectedFile(items[0].file)
          setIsGeoJSONFile(items[0].isGeo)
          setMetadataJson(JSON.stringify(items[0].metadata, null, 2))
        }
        setUploadStatus({ type: 'success', message: `Loaded ${items.length} file(s). Review first metadata below or submit.` })
      } catch (error) {
        setParsedItems([])
        setUploadStatus({ type: 'error', message: 'Failed to parse one or more files. Ensure all are valid JSON/GeoJSON.' })
      }
    })()
  }

  // Validate metadata structure
  const validateMetadata = (metadata: any): string | null => {
    // Required: name and bounds
    if (!metadata.name) {
      return 'Missing required field: name'
    }

    if (!metadata.bounds) {
      return 'Missing required field: bounds'
    }

    // Validate bounds (support both formats)
    if (Array.isArray(metadata.bounds)) {
      // Format: [minLon, minLat, maxLon, maxLat]
      if (metadata.bounds.length !== 4) {
        return 'Bounds array must have 4 values: [minLon, minLat, maxLon, maxLat]'
      }
      const [minLon, minLat, maxLon, maxLat] = metadata.bounds
      if (minLat >= maxLat) {
        return 'minLat must be less than maxLat'
      }
      if (minLon >= maxLon) {
        return 'minLon must be less than maxLon'
      }
    } else if (typeof metadata.bounds === 'object') {
      // Format: { minLat, maxLat, minLon, maxLon }
      if (!metadata.bounds.minLat || !metadata.bounds.maxLat || 
          !metadata.bounds.minLon || !metadata.bounds.maxLon) {
        return 'Bounds must include minLat, maxLat, minLon, maxLon'
      }
      if (metadata.bounds.minLat >= metadata.bounds.maxLat) {
        return 'minLat must be less than maxLat'
      }
      if (metadata.bounds.minLon >= metadata.bounds.maxLon) {
        return 'minLon must be less than maxLon'
      }
    } else {
      return 'Bounds must be an array or object'
    }

    // Validate center (optional, can be calculated)
    if (metadata.center) {
      if (Array.isArray(metadata.center)) {
        // Format: [lon, lat, zoom]
        if (metadata.center.length !== 3) {
          return 'Center array must have 3 values: [lon, lat, zoom]'
        }
      } else if (typeof metadata.center === 'object') {
        // Format: { lat, lon }
        if (!metadata.center.lat || !metadata.center.lon) {
          return 'Center must include lat and lon'
        }
      }
    }

    // Validate zoom (support both formats)
    if (metadata.zoom) {
      if (!metadata.zoom.min || !metadata.zoom.max) {
        return 'Zoom must include min and max'
      }
      if (metadata.zoom.min >= metadata.zoom.max) {
        return 'min zoom must be less than max zoom'
      }
    } else if (metadata.minzoom !== undefined && metadata.maxzoom !== undefined) {
      // TileJSON format
      if (metadata.minzoom >= metadata.maxzoom) {
        return 'minzoom must be less than maxzoom'
      }
    }

    return null
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedClubId) {
      setUploadStatus({
        type: 'error',
        message: 'Please select a golf course'
      })
      return
    }

    if (!metadataJson.trim()) {
      setUploadStatus({
        type: 'error',
        message: 'Please provide metadata JSON'
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setCurrentStep('Validating input...')
    setUploadStatus({ type: null, message: '' })

    try {
      // If multiple files were selected, process as batch
      if (parsedItems.length > 0) {
        const total = parsedItems.length
        for (let i = 0; i < total; i++) {
          const item = parsedItems[i]
          setCurrentStep(`Validating ${item.file.name} (${i + 1}/${total})...`)
          setUploadProgress(Math.max(1, Math.floor((i / total) * 100)))

          const validationError = validateMetadata(item.metadata)
          if (validationError) {
            setUploadStatus({ type: 'error', message: `${item.file.name}: ${validationError}` })
            continue
          }

          setCurrentStep(`Creating tileset for ${item.file.name} (${i + 1}/${total})...`)
          setUploadProgress(Math.max(2, Math.floor(((i + 0.25) / total) * 100)))
          // Ensure r2FolderPath aligns with overlay upload path
          try {
            const clubName = golfClubs.find(c => c.id === selectedClubId)?.name || 'course'
            const base = sanitizeGolfCourseName(clubName)
            if (!item.metadata.r2FolderPath) item.metadata.r2FolderPath = `${base}/tiles`
          } catch {}
          const created = await TilesetService.createTileset(selectedClubId, item.metadata)
          if (!created) {
            setUploadStatus({ type: 'error', message: `${item.file.name}: failed to create tileset` })
            continue
          }

          if (item.isGeo) {
            try {
              setCurrentStep(`Uploading overlay ${item.file.name} (${i + 1}/${total})...`)
              setUploadProgress(Math.max(3, Math.floor(((i + 0.6) / total) * 100)))
              const clubName = golfClubs.find(c => c.id === selectedClubId)?.name || 'course'
              const base = sanitizeGolfCourseName(clubName)
              const key = `${base}/geojson/${item.file.name}`
              await R2Service.uploadFile(key, item.file)
            } catch {}
          }

          setUploadProgress(Math.floor(((i + 1) / total) * 100))
        }

        setCurrentStep('Complete!')
        setUploadStatus({ type: 'success', message: `Processed ${parsedItems.length} file(s).` })

        // Persist overlays mapping for this club/folder so client toggles are enabled immediately
        try {
          const clubName = golfClubs.find(c => c.id === selectedClubId)?.name || 'course'
          const base = sanitizeGolfCourseName(clubName)
          const candidates = selectedFiles.filter(f => /\.geojson$/i.test(f.name)).map(f => `${base}/geojson/${f.name}`)
          const CATEGORY_ORDER = [
            { id: 'building', synonyms: ['building', 'buildings'] },
            { id: 'course_building', synonyms: ['course_building', 'course-building', 'coursebuilding'] },
            { id: 'heathland', synonyms: ['heathland', 'heath_land'] },
            { id: 'open_sand', synonyms: ['open_sand', 'opensand', 'sand'] },
            { id: 'open_water', synonyms: ['open_water', 'openwater', 'water'] },
            { id: 'holes', synonyms: ['holes', 'golf_holes', 'course_holes'] },
            { id: 'wetland_and_shrubs', synonyms: ['wetland_and_shrubs', 'wetland_shrubs', 'wetland', 'shrubs'] },
            { id: 'woodland', synonyms: ['woodland', 'woods', 'forest'] },
          ]
          const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
          const overlays: Record<string, string> = {}
          for (const cat of CATEGORY_ORDER) {
            const match = candidates.find(k => {
              const filename = k.split('/').pop() || k
              const baseName = filename.replace(/\.(geo)?json$/i,'')
              const b = norm(baseName)
              return cat.synonyms.some(sym => b.includes(norm(sym)))
            })
            if (match) overlays[cat.id] = match
          }
          if (Object.keys(overlays).length) {
            const { data } = await supabase
              .from('golf_course_tilesets')
              .select('id')
              .eq('golf_club_id', selectedClubId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (data?.id) {
              await supabase.from('golf_course_tilesets').update({ overlays }).eq('id', data.id)
            }
          }
        } catch {}

        // Reset batch selection
        setParsedItems([])
        setSelectedFiles([])
        setSelectedFile(null)
        setIsGeoJSONFile(false)
        setMetadataJson('')
        setSelectedClubId('')
        onSuccess?.()
      } else {
        // Fallback: single metadata from editor
        // Parse and validate JSON
        const metadata = JSON.parse(metadataJson)
        setUploadProgress(25)
        
        const validationError = validateMetadata(metadata)
        if (validationError) {
          setUploadStatus({
            type: 'error',
            message: validationError
          })
          setIsUploading(false)
          return
        }

        setCurrentStep('Submitting tileset metadata...')
        setUploadProgress(60)
        // Upload to database
        // Ensure r2FolderPath aligns with overlay upload path
        try {
          const clubName = golfClubs.find(c => c.id === selectedClubId)?.name || 'course'
          const base = sanitizeGolfCourseName(clubName)
          if (!metadata.r2FolderPath) (metadata as any).r2FolderPath = `${base}/tiles`
        } catch {}
        const result = await TilesetService.createTileset(selectedClubId, metadata)

        if (result) {
          // If a GeoJSON file was provided, upload it to R2 so clients can toggle it as an overlay
          if (selectedFile && isGeoJSONFile) {
            try {
              setCurrentStep('Uploading overlay GeoJSON to storage...')
              setUploadProgress(80)
              const clubName = golfClubs.find(c => c.id === selectedClubId)?.name || 'course'
              const base = sanitizeGolfCourseName(clubName)
              const key = `${base}/geojson/${selectedFile.name}`
              await R2Service.uploadFile(key, selectedFile)
            } catch (e) {
              // Non-fatal: log but proceed
              console.warn('Overlay upload skipped/failed:', e)
            }
          }
          setUploadProgress(100)
          setCurrentStep('Complete!')
          setUploadStatus({
            type: 'success',
            message: `Tileset "${result.name}" created successfully! Clients can now view it on their dashboard.`
          })
          // Persist overlays mapping for this club/folder so client toggles are enabled immediately
          try {
            const clubName = golfClubs.find(c => c.id === selectedClubId)?.name || 'course'
            const base = sanitizeGolfCourseName(clubName)
            const candidates = selectedFile && isGeoJSONFile ? [`${base}/geojson/${selectedFile.name}`] : []
            const CATEGORY_ORDER = [
              { id: 'building', synonyms: ['building', 'buildings'] },
              { id: 'course_building', synonyms: ['course_building', 'course-building', 'coursebuilding'] },
              { id: 'heathland', synonyms: ['heathland', 'heath_land'] },
              { id: 'open_sand', synonyms: ['open_sand', 'opensand', 'sand'] },
              { id: 'open_water', synonyms: ['open_water', 'openwater', 'water'] },
              { id: 'holes', synonyms: ['holes', 'golf_holes', 'course_holes'] },
              { id: 'wetland_and_shrubs', synonyms: ['wetland_and_shrubs', 'wetland_shrubs', 'wetland', 'shrubs'] },
              { id: 'woodland', synonyms: ['woodland', 'woods', 'forest'] },
            ]
            const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
            const overlays: Record<string, string> = {}
            for (const cat of CATEGORY_ORDER) {
              const match = candidates.find(k => {
                const filename = k.split('/').pop() || k
                const baseName = filename.replace(/\.(geo)?json$/i,'')
                const b = norm(baseName)
                return cat.synonyms.some(sym => b.includes(norm(sym)))
              })
              if (match) overlays[cat.id] = match
            }
            if (Object.keys(overlays).length) {
              await supabase.from('golf_course_tilesets').update({ overlays }).eq('id', result.id)
            }
          } catch {}
          
          // Reset form
          setMetadataJson('')
          setSelectedClubId('')
          setSelectedFile(null)
          setIsGeoJSONFile(false)
          
          // Call success callback
          onSuccess?.()
        } else {
          setUploadStatus({
            type: 'error',
            message: 'Failed to create tileset. Please check the console for details.'
          })
        }
      }
    } catch (error) {
      console.error('Error uploading tileset:', error)
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload tileset metadata'
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => {
        setCurrentStep('')
        setUploadProgress(0)
      }, 1500)
    }
  }

  // Load example metadata
  const loadExample = () => {
    const example = {
      name: "Example Golf Course - Main Course",
      description: "High-resolution orthomosaic tiles for Mapbox overlay",
      bounds: [5.755898, 51.361755, 5.779088, 51.372146],
      center: [5.767493, 51.366951, 17],
      minzoom: 14,
      maxzoom: 20,
      tileSize: 512,
      attribution: "© Example Golf Course"
    }
    
    setMetadataJson(JSON.stringify(example, null, 2))
    setUploadStatus({
      type: 'success',
      message: 'Example metadata loaded (TileJSON format). Update the values and submit.'
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="w-5 h-5" />
          Upload Tileset Metadata
        </CardTitle>
        <CardDescription>
          Add metadata for PNG tiles stored in R2 to display them on the golf course map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Golf Course Selection */}
        <div className="space-y-2">
          <Label htmlFor="golf-club">Select Golf Course</Label>
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger id="golf-club">
              <SelectValue placeholder="Choose a golf course..." />
            </SelectTrigger>
            <SelectContent>
              {golfClubs.map((club) => (
                <SelectItem key={club.id} value={club.id}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="metadata-file">Upload Metadata JSON/GeoJSON File</Label>
          <div className="flex gap-2">
            <Input
              id="metadata-file"
              type="file"
              accept=".json,.geojson,application/json,application/geo+json"
              multiple
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={loadExample}
            >
              <FileJson className="w-4 h-4 mr-2" />
              Load Example
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a JSON or GeoJSON file with tileset metadata or paste it below
          </p>
          {selectedFiles.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedFiles.length} file(s) selected
            </p>
          )}
        </div>

        {/* JSON Editor */}
        <div className="space-y-2">
          <Label htmlFor="metadata-json">Metadata JSON</Label>
          <Textarea
            id="metadata-json"
            value={metadataJson}
            onChange={(e) => setMetadataJson(e.target.value)}
            placeholder='{\n  "name": "Course Name",\n  "bounds": { ... },\n  ...\n}'
            className="font-mono text-sm min-h-[300px]"
          />
          <p className="text-xs text-muted-foreground">
            Required: name, bounds. Supports both formats:<br/>
            • TileJSON: bounds: [minLon, minLat, maxLon, maxLat], center: [lon, lat, zoom], minzoom, maxzoom<br/>
            • Standard: bounds: {"{minLat, maxLat, minLon, maxLon}"}, center: {"{lat, lon}"}, zoom: {"{min, max, default}"}
          </p>
        </div>

        {/* Status Messages */}
        {uploadStatus.type && (
          <Alert variant={uploadStatus.type === 'error' ? 'destructive' : 'default'}>
            {uploadStatus.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{uploadStatus.message}</AlertDescription>
          </Alert>
        )}

        {/* Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate">{currentStep}</span>
              <span className="font-medium">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !selectedClubId || !metadataJson.trim()}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Tileset Metadata
              </>
            )}
          </Button>
        </div>

        {/* Help Section */}
        <div className="border-t pt-4 space-y-2">
          <h4 className="font-medium text-sm">Metadata Format</h4>
          <p className="text-xs text-muted-foreground">
            Supports TileJSON format (your format) and standard format:
          </p>
          <div className="text-xs font-mono bg-muted p-2 rounded">
            {`{
  "name": "Course Name",
  "bounds": [minLon, minLat, maxLon, maxLat],
  "center": [lon, lat, zoom],
  "minzoom": 14,
  "maxzoom": 20,
  "tileSize": 512,
  "attribution": "© Your Company"
}`}
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside mt-2">
            <li>Tiles must be in R2 bucket with z/x/y structure</li>
            <li>r2FolderPath auto-generated from name if not provided</li>
            <li>Use Web Mercator projection (EPSG:3857)</li>
            <li>See STEP_BY_STEP_MAPBOX_GUIDE.md for detailed instructions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default TilesetMetadataUploader
