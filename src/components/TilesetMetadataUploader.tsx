import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TilesetService } from '@/lib/tilesetService'
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
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setMetadataJson(content)
      
      // Try to validate JSON
      try {
        JSON.parse(content)
        setUploadStatus({
          type: 'success',
          message: 'JSON file loaded successfully. Review and submit below.'
        })
      } catch (error) {
        setUploadStatus({
          type: 'error',
          message: 'Invalid JSON file. Please check the file format.'
        })
      }
    }
    reader.readAsText(file)
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
    setUploadStatus({ type: null, message: '' })

    try {
      // Parse and validate JSON
      const metadata = JSON.parse(metadataJson)
      
      const validationError = validateMetadata(metadata)
      if (validationError) {
        setUploadStatus({
          type: 'error',
          message: validationError
        })
        setIsUploading(false)
        return
      }

      // Upload to database
      const result = await TilesetService.createTileset(selectedClubId, metadata)

      if (result) {
        setUploadStatus({
          type: 'success',
          message: `Tileset "${result.name}" created successfully! Clients can now view it on their dashboard.`
        })
        
        // Reset form
        setMetadataJson('')
        setSelectedClubId('')
        
        // Call success callback
        onSuccess?.()
      } else {
        setUploadStatus({
          type: 'error',
          message: 'Failed to create tileset. Please check the console for details.'
        })
      }
    } catch (error) {
      console.error('Error uploading tileset:', error)
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upload tileset metadata'
      })
    } finally {
      setIsUploading(false)
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
          <Label htmlFor="metadata-file">Upload Metadata JSON File</Label>
          <div className="flex gap-2">
            <Input
              id="metadata-file"
              type="file"
              accept=".json"
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
            Upload a JSON file with tileset metadata or paste it below
          </p>
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
