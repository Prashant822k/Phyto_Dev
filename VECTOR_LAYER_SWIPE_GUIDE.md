# Vector Layer Swipe Feature - Complete Guide

## Overview
This guide explains how to implement a swipe feature to display vector layers over raster base maps using the same coordinate system and metadata from `golf_course_tilesets`.

## R2 Storage Structure

### Path Hierarchy
```
map-stats-tiles-prod/
├── test20/
│   ├── tiles/                    # Raster tiles (base map)
│   │   ├── 14/
│   │   ├── 15/
│   │   └── ...
│   └── Vector_Layers/            # Vector layers (overlays)
│       ├── fairways.geojson
│       ├── greens.geojson
│       ├── bunkers.geojson
│       └── water_hazards.geojson
```

### Database Schema

#### `vector_layers` Table
```sql
CREATE TABLE public.vector_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  golf_club_id uuid NOT NULL REFERENCES golf_clubs(id),
  course_name text NOT NULL,              -- NEW: e.g., "test20"
  name text NOT NULL,                     -- Layer name (e.g., "fairways")
  description text,
  layer_type text NOT NULL,               -- "geojson"
  r2_key text NOT NULL,                   -- Full R2 path: "test20/Vector_Layers/fairways.geojson"
  file_size bigint,
  style jsonb DEFAULT '{"fillColor": "#3F51B5", "fillOpacity": 0.5, "strokeColor": "#1A237E", "strokeWidth": 2}',
  is_active boolean DEFAULT true,
  z_index integer DEFAULT 0,              -- Layer stacking order
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

#### `golf_course_tilesets` Table (Existing)
Contains metadata that vector layers will share:
- Bounds: `min_lat`, `max_lat`, `min_lon`, `max_lon`
- Center: `center_lat`, `center_lon`
- Zoom levels: `min_zoom`, `max_zoom`, `default_zoom`
- R2 path: `r2_folder_path` (e.g., "test20/tiles")
- Flight data: `flight_date`, `flight_time`

## Upload Process

### 1. Fixed Edge Function
**File:** `supabase/functions/upload-vector-layer/index.ts`

**Key Changes:**
- ✅ Fixed `AwsV4Signer` import → Now uses `AwsClient` from `aws_api@v0.8.1`
- ✅ Added `course_name` parameter (extracted from `r2_folder_path`)
- ✅ New R2 path: `{course_name}/Vector_Layers/{sanitized_name}.{ext}`

**Example:**
```typescript
// Input
course_name: "test20"
name: "Fairways Layer"
file: fairways.geojson

// Output R2 Key
"test20/Vector_Layers/Fairways_Layer.geojson"
```

### 2. Updated Upload Component
**File:** `src/components/admin/VectorLayerUploader.tsx`

**Features:**
- Course selector dropdown (fetches from `golf_course_tilesets`)
- Live R2 path preview
- Auto-selects if only one course exists
- Extracts `course_name` from `r2_folder_path`

**UI Flow:**
```
1. Select Golf Course → "Test Course 20"
2. Upload GeoJSON file → fairways.geojson
3. Enter Layer Name → "Fairways"
4. Preview shows → R2 Path: test20/Vector_Layers/Fairways.geojson
5. Upload → Stored in R2 + DB record created
```

## Swipe Feature Implementation

### Architecture

```
┌─────────────────────────────────────────┐
│         Map Component                    │
│  ┌───────────────────────────────────┐  │
│  │   Raster Base Layer (Tiles)       │  │
│  │   - From golf_course_tilesets     │  │
│  │   - URL: test20/tiles/{z}/{x}/{y} │  │
│  └───────────────────────────────────┘  │
│              ↓ Same Bounds               │
│  ┌───────────────────────────────────┐  │
│  │   Vector Overlay Layer            │  │
│  │   - From vector_layers            │  │
│  │   - URL: test20/Vector_Layers/... │  │
│  │   - GeoJSON rendered on map       │  │
│  └───────────────────────────────────┘  │
│              ↓                           │
│  ┌───────────────────────────────────┐  │
│  │   Swipe Control                   │  │
│  │   - Vertical slider               │  │
│  │   - Left: Raster only             │  │
│  │   - Right: Vector overlay         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Implementation Steps

#### 1. Fetch Vector Layers for Course

```typescript
// src/hooks/useVectorLayers.ts
export function useVectorLayers(courseName: string) {
  const [layers, setLayers] = useState<VectorLayer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLayers = async () => {
      const { data, error } = await supabase
        .from('vector_layers')
        .select('*')
        .eq('course_name', courseName)
        .eq('is_active', true)
        .order('z_index')
      
      if (data) setLayers(data)
      setLoading(false)
    }
    
    fetchLayers()
  }, [courseName])

  return { layers, loading }
}
```

#### 2. Load GeoJSON from R2

```typescript
// src/lib/vectorLayerService.ts
export async function fetchVectorLayerData(r2Key: string): Promise<GeoJSON.FeatureCollection> {
  const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL
  const url = `${r2PublicUrl}/${r2Key}`
  
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch vector layer')
  
  return await response.json()
}
```

#### 3. Mapbox GL JS Swipe Component

```typescript
// src/components/MapSwipeControl.tsx
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxCompare from 'mapbox-gl-compare'

interface MapSwipeControlProps {
  baseMap: {
    tileUrl: string
    bounds: [number, number, number, number]
    center: [number, number]
    zoom: number
  }
  vectorLayers: Array<{
    id: string
    name: string
    r2_key: string
    style: any
  }>
}

export function MapSwipeControl({ baseMap, vectorLayers }: MapSwipeControlProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const beforeMapRef = useRef<mapboxgl.Map>()
  const afterMapRef = useRef<mapboxgl.Map>()

  useEffect(() => {
    if (!containerRef.current) return

    // Left map: Raster tiles only
    const beforeMap = new mapboxgl.Map({
      container: 'before-map',
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: baseMap.center,
      zoom: baseMap.zoom,
      bounds: baseMap.bounds
    })

    beforeMap.on('load', () => {
      // Add raster tile source
      beforeMap.addSource('raster-tiles', {
        type: 'raster',
        tiles: [baseMap.tileUrl],
        tileSize: 256
      })

      beforeMap.addLayer({
        id: 'raster-layer',
        type: 'raster',
        source: 'raster-tiles'
      })
    })

    // Right map: Raster tiles + Vector overlays
    const afterMap = new mapboxgl.Map({
      container: 'after-map',
      style: 'mapbox://styles/mapbox/satellite-v9',
      center: baseMap.center,
      zoom: baseMap.zoom,
      bounds: baseMap.bounds
    })

    afterMap.on('load', async () => {
      // Add raster tile source
      afterMap.addSource('raster-tiles', {
        type: 'raster',
        tiles: [baseMap.tileUrl],
        tileSize: 256
      })

      afterMap.addLayer({
        id: 'raster-layer',
        type: 'raster',
        source: 'raster-tiles'
      })

      // Add vector layers
      for (const layer of vectorLayers) {
        const geojson = await fetchVectorLayerData(layer.r2_key)
        
        afterMap.addSource(layer.id, {
          type: 'geojson',
          data: geojson
        })

        // Add fill layer
        afterMap.addLayer({
          id: `${layer.id}-fill`,
          type: 'fill',
          source: layer.id,
          paint: {
            'fill-color': layer.style.fillColor || '#3F51B5',
            'fill-opacity': layer.style.fillOpacity || 0.5
          }
        })

        // Add outline layer
        afterMap.addLayer({
          id: `${layer.id}-outline`,
          type: 'line',
          source: layer.id,
          paint: {
            'line-color': layer.style.strokeColor || '#1A237E',
            'line-width': layer.style.strokeWidth || 2
          }
        })
      }
    })

    // Initialize swipe control
    const compare = new MapboxCompare(beforeMap, afterMap, '#comparison-container', {
      mousemove: true,
      orientation: 'vertical'
    })

    beforeMapRef.current = beforeMap
    afterMapRef.current = afterMap

    return () => {
      beforeMap.remove()
      afterMap.remove()
    }
  }, [baseMap, vectorLayers])

  return (
    <div ref={containerRef} id="comparison-container" className="w-full h-full">
      <div id="before-map" className="absolute inset-0" />
      <div id="after-map" className="absolute inset-0" />
    </div>
  )
}
```

#### 4. Integration with Existing Map Component

```typescript
// src/components/MapboxGolfCourseMap.tsx
import { MapSwipeControl } from './MapSwipeControl'
import { useVectorLayers } from '@/hooks/useVectorLayers'

export function MapboxGolfCourseMap({ tileset }: { tileset: GolfCourseTileset }) {
  const [swipeMode, setSwipeMode] = useState(false)
  
  // Extract course name from r2_folder_path
  const courseName = tileset.r2_folder_path.split('/')[0]
  
  // Fetch vector layers for this course
  const { layers: vectorLayers, loading } = useVectorLayers(courseName)

  if (swipeMode && vectorLayers.length > 0) {
    return (
      <MapSwipeControl
        baseMap={{
          tileUrl: tileset.tile_url_pattern,
          bounds: [tileset.min_lon, tileset.min_lat, tileset.max_lon, tileset.max_lat],
          center: [tileset.center_lon, tileset.center_lat],
          zoom: tileset.default_zoom
        }}
        vectorLayers={vectorLayers}
      />
    )
  }

  // Regular map view (existing implementation)
  return <div>Regular Map</div>
}
```

### UI Controls

```typescript
// Add toggle button to switch between modes
<Button onClick={() => setSwipeMode(!swipeMode)}>
  {swipeMode ? 'Exit Swipe Mode' : 'Compare with Vector Layers'}
</Button>

// Layer selector for vector layers
<Select>
  <SelectTrigger>Select Vector Layer</SelectTrigger>
  <SelectContent>
    {vectorLayers.map(layer => (
      <SelectItem key={layer.id} value={layer.id}>
        {layer.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Shared Metadata Usage

Vector layers automatically inherit metadata from `golf_course_tilesets`:

```typescript
// When rendering vector layers, use the same bounds and zoom levels
const { data: tileset } = await supabase
  .from('golf_course_tilesets')
  .select('*')
  .eq('r2_folder_path', `${courseName}/tiles`)
  .single()

// Apply to vector layer rendering
map.fitBounds([
  [tileset.min_lon, tileset.min_lat],
  [tileset.max_lon, tileset.max_lat]
])
```

## Example: Complete Upload to Display Flow

### 1. Upload Vector Layer
```
Admin → Vector Layer Uploader
  ↓
Select Course: "Test Course 20" (test20)
Upload File: fairways.geojson
Layer Name: "Fairways"
  ↓
Edge Function: upload-vector-layer
  ↓
R2 Storage: test20/Vector_Layers/Fairways.geojson
DB Record: {
  golf_club_id: "...",
  course_name: "test20",
  name: "Fairways",
  r2_key: "test20/Vector_Layers/Fairways.geojson",
  style: { fillColor: "#00FF00", fillOpacity: 0.3 }
}
```

### 2. Display on Map
```
Client → Map View
  ↓
Load Tileset: test20 (from golf_course_tilesets)
  ↓
Fetch Vector Layers: WHERE course_name = 'test20'
  ↓
Enable Swipe Mode
  ↓
Left Side: Raster tiles (test20/tiles/{z}/{x}/{y})
Right Side: Raster tiles + Vector overlay (Fairways.geojson)
  ↓
User drags slider to compare
```

## Dependencies

### Required Packages
```json
{
  "dependencies": {
    "mapbox-gl": "^2.15.0",
    "mapbox-gl-compare": "^0.4.0",
    "@turf/turf": "^6.5.0"  // For GeoJSON operations
  }
}
```

### Environment Variables
```env
VITE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
VITE_MAPBOX_ACCESS_TOKEN=pk.xxxxx
```

## Testing Checklist

- [ ] Upload vector layer via admin UI
- [ ] Verify R2 path: `test20/Vector_Layers/layer_name.geojson`
- [ ] Verify DB record has `course_name` field
- [ ] Load vector layer on map (same bounds as raster)
- [ ] Enable swipe mode
- [ ] Verify left side shows raster only
- [ ] Verify right side shows raster + vector overlay
- [ ] Test slider interaction
- [ ] Test with multiple vector layers
- [ ] Test layer styling (colors, opacity, stroke)
- [ ] Test z-index ordering

## Troubleshooting

### Vector layer not displaying
1. Check R2 public URL is accessible
2. Verify GeoJSON is valid (use geojson.io)
3. Check bounds match between raster and vector
4. Verify `course_name` matches in both tables

### Swipe not working
1. Ensure `mapbox-gl-compare` is installed
2. Check both maps are initialized
3. Verify container has proper dimensions
4. Check console for errors

### Performance issues
1. Simplify GeoJSON (reduce vertices)
2. Use vector tiles instead of GeoJSON for large datasets
3. Implement layer clustering
4. Add zoom-based layer visibility

## Migration Command

Run the migration to add `course_name` column:

```bash
supabase db push
```

Or manually:
```sql
psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/migrations/20241116000000_add_course_name_to_vector_layers.sql
```

## Next Steps

1. ✅ Edge function fixed (AwsClient import)
2. ✅ R2 path structure updated (test20/Vector_Layers/)
3. ✅ Upload UI with course selector
4. ✅ Migration for course_name column
5. ⏳ Implement MapSwipeControl component
6. ⏳ Add swipe toggle to existing map
7. ⏳ Test with real data
8. ⏳ Add layer styling UI
9. ⏳ Add layer visibility controls
10. ⏳ Performance optimization
