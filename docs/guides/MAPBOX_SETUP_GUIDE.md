# Mapbox Golf Course Overlay Setup Guide

## Overview

This guide explains how to set up and use the Mapbox GL component to display golf course XYZ tiles overlaid on a base Mapbox satellite map.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ MapboxGolfCourseMap Component                       │
│  ├── Base Layer: Mapbox Satellite Streets          │
│  └── Overlay: Golf Course PNG Tiles from R2        │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ Tileset Metadata (Database)                         │
│  ├── Bounds (lat/lon)                               │
│  ├── Zoom levels (min/max)                          │
│  ├── R2 folder path                                 │
│  └── Tile URL pattern                               │
└─────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────┐
│ Cloudflare R2 Storage                               │
│  pine-valley-golf-club/                             │
│    └── tiles/                                       │
│        ├── 14/4823/6209.png                         │
│        ├── 14/4823/6210.png                         │
│        ├── 15/9646/12418.png                        │
│        └── ...                                      │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Mapbox Account & Access Token**
   - Sign up at https://www.mapbox.com/
   - Get your access token from https://account.mapbox.com/access-tokens/
   - Add to your `.env` file:
     ```env
     VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoiY...your-token-here
     ```

2. **XYZ Tiles in R2**
   - Your tiles must be organized in the standard XYZ structure: `{z}/{x}/{y}.png`
   - Example: `pine-valley-golf-club/tiles/14/4823/6209.png`

3. **Tileset Metadata**
   - You need to know the geographic bounds of your tiles
   - Min/max zoom levels where tiles exist
   - Center point of the golf course

## Step 1: Database Setup

Run the SQL schema to create the tileset metadata table:

```bash
# In Supabase SQL Editor, run:
cat tileset-metadata-schema.sql
```

This creates the `golf_course_tilesets` table with RLS policies.

## Step 2: Prepare Your Tile Metadata

### Option A: Manual Database Insert

```sql
INSERT INTO public.golf_course_tilesets (
  golf_club_id,
  name,
  description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path,
  tile_url_pattern,
  tile_size,
  format,
  attribution
) VALUES (
  (SELECT id FROM public.golf_clubs WHERE name = 'Pine Valley Golf Club'),
  'Main Course Overlay',
  'High-resolution satellite imagery of the main 18-hole course',
  39.980, 39.995, -74.965, -74.945,  -- Adjust to your bounds
  39.9875, -74.955,  -- Center point
  14, 20, 17,  -- Zoom levels (min, max, default)
  'pine-valley-golf-club/tiles',  -- R2 folder
  '{z}/{x}/{y}.png',  -- Tile pattern
  256,  -- Tile size
  'png',
  '© Pine Valley Golf Club'
);
```

### Option B: Import from JSON

1. Create a JSON file with your metadata (see `example-tileset-metadata.json`)
2. Use the TilesetService to import:

```typescript
import { TilesetService } from '@/lib/tilesetService';

const jsonContent = await fetch('/metadata.json').then(r => r.text());
const tileset = await TilesetService.uploadTilesetMetadataFromJSON(
  golfClubId, 
  jsonContent
);
```

## Step 3: Tile Organization in R2

Your tiles **MUST** be organized like this:

```
map-stats-tiles-prod/
└── {golf-course-name}/
    └── tiles/
        ├── 14/              # Zoom level 14
        │   └── 4823/        # X coordinate
        │       ├── 6209.png # Y coordinate
        │       └── 6210.png
        ├── 15/              # Zoom level 15
        │   └── 9646/
        │       └── 12418.png
        └── 16/              # Zoom level 16
            └── 19292/
                └── 24836.png
```

**Important**: The tile coordinates (z, x, y) must match Web Mercator projection standards for your geographic bounds.

## Step 4: Setting Up the Proxy Endpoint (Required)

Since R2 requires signed URLs that expire, you need a proxy endpoint to serve tiles:

### Option 1: Supabase Edge Function (Recommended)

Create `supabase/functions/tile-proxy/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { R2Service } from '../r2Service.ts' // Adapt your R2 service

serve(async (req) => {
  const url = new URL(req.url)
  const path = url.pathname.replace('/tile-proxy/', '')
  
  // path will be like: "pine-valley-golf-club/tiles/14/4823/6209.png"
  
  try {
    // Get signed URL from R2
    const signedUrl = await R2Service.getGetUrl(path, 3600)
    
    // Fetch the tile from R2
    const response = await fetch(signedUrl.url)
    const blob = await response.blob()
    
    // Return the tile with appropriate headers
    return new Response(blob, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response('Tile not found', { status: 404 })
  }
})
```

Deploy:
```bash
supabase functions deploy tile-proxy
```

### Option 2: Simple Tile URL Template

If your tiles are public (or you have a CDN), you can use direct URLs:

```typescript
// In the component, modify the tile URL:
const tileUrlTemplate = `https://your-r2-public-url/${tileset.r2_folder_path}/${tileset.tile_url_pattern}`;
```

## Step 5: Using the Component

### Basic Usage

```typescript
import MapboxGolfCourseMap from '@/components/MapboxGolfCourseMap';

function GolfCoursePage() {
  const golfClubId = 'uuid-of-golf-club';
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  return (
    <MapboxGolfCourseMap
      golfClubId={golfClubId}
      mapboxAccessToken={mapboxToken}
    />
  );
}
```

### Advanced Usage

```typescript
<MapboxGolfCourseMap
  golfClubId={golfClubId}
  mapboxAccessToken={mapboxToken}
  baseStyle="mapbox://styles/mapbox/satellite-v9"  // Different base map
  showControls={true}  // Show zoom/navigation controls
  className="h-screen"  // Custom styling
/>
```

## Step 6: Generating XYZ Tiles

If you have a GeoTIFF or other imagery format, you need to convert it to XYZ tiles:

### Using GDAL (Recommended)

```bash
# Install GDAL
# Ubuntu/Debian: sudo apt-get install gdal-bin
# macOS: brew install gdal

# Convert GeoTIFF to XYZ tiles
gdal2tiles.py \
  --zoom=14-20 \
  --processes=4 \
  --tilesize=256 \
  --xyz \
  input-image.tif \
  output-tiles/
```

This creates tiles in the correct z/x/y.png structure.

### Using MapTiler (GUI Option)

1. Download MapTiler Desktop: https://www.maptiler.com/desktop/
2. Import your imagery
3. Select "XYZ Tiles" as output format
4. Set zoom levels (14-20 recommended for golf courses)
5. Export

## Determining Tile Bounds

To find the correct bounds for your golf course:

1. **Use Google Earth**:
   - Navigate to your golf course
   - Right-click → "Properties"
   - Note the lat/lon coordinates

2. **Use Mapbox Studio**:
   - Visit https://studio.mapbox.com/
   - Navigate to your course
   - Click on the map to see coordinates

3. **Programmatically**:
   ```javascript
   // After generating tiles, check the metadata
   // bounds are usually in metadata.json
   ```

## Uploading Tiles to R2

```bash
# Using AWS CLI (compatible with R2)
aws s3 sync ./output-tiles/ s3://map-stats-tiles-prod/pine-valley-golf-club/tiles/ \
  --endpoint-url=https://<account-id>.r2.cloudflarestorage.com \
  --profile=r2
```

Or use the Cloudflare dashboard to upload.

## Troubleshooting

### Tiles Not Showing

1. **Check browser console** for 404 errors
2. **Verify tile URLs** are being generated correctly
3. **Check R2 access** - ensure signed URLs are working
4. **Verify coordinates** - tiles must match Web Mercator projection

### Map Not Loading

1. **Check Mapbox token** is valid
2. **Verify tileset exists** in database for that golf club
3. **Check bounds** are correct (minLat < maxLat, minLon < maxLon)

### Performance Issues

1. **Reduce max zoom level** to 18 instead of 20
2. **Use smaller tile size** (256px instead of 512px)
3. **Implement tile caching** in your proxy endpoint
4. **Use WebP format** instead of PNG for smaller file sizes

## Example: Complete Workflow

1. **Get imagery** of golf course (drone, satellite, etc.)
2. **Georeference** the image (add lat/lon coordinates)
3. **Generate tiles**:
   ```bash
   gdal2tiles.py --zoom=14-19 --xyz course.tif tiles/
   ```
4. **Upload to R2**:
   ```bash
   aws s3 sync tiles/ s3://map-stats-tiles-prod/augusta-national/tiles/
   ```
5. **Add metadata** to database:
   ```sql
   INSERT INTO golf_course_tilesets (...) VALUES (...);
   ```
6. **Display** in your React app:
   ```typescript
   <MapboxGolfCourseMap golfClubId={clubId} mapboxAccessToken={token} />
   ```

## Best Practices

1. **Tile Size**: Use 256px for compatibility, 512px for retina displays
2. **Zoom Levels**: 14-19 is usually sufficient for golf courses
3. **Format**: PNG for transparency, JPEG for smaller sizes, WebP for best compression
4. **Caching**: Implement aggressive caching (1 hour+) for tiles
5. **Attribution**: Always include proper attribution for imagery sources
6. **Bounds**: Be precise with bounds to avoid loading unnecessary tiles

## Advanced Features

### Multiple Tilesets per Golf Course

You can have multiple tilesets (e.g., different seasons):

```sql
-- Summer imagery
INSERT INTO golf_course_tilesets (..., name, ...) VALUES (..., 'Summer 2024', ...);

-- Winter imagery
INSERT INTO golf_course_tilesets (..., name, ...) VALUES (..., 'Winter 2024', ...);
```

### Dynamic Overlay Switching

Modify the component to allow users to switch between different tilesets for the same course.

### Adding Markers/Annotations

Use Mapbox GL markers to add points of interest:

```typescript
const marker = new mapboxgl.Marker()
  .setLngLat([lon, lat])
  .setPopup(new mapboxgl.Popup().setHTML('<h3>Hole 1</h3>'))
  .addTo(map.current);
```

## Resources

- Mapbox GL JS Docs: https://docs.mapbox.com/mapbox-gl-js/
- GDAL Utilities: https://gdal.org/programs/
- XYZ Tile Spec: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
- Web Mercator Projection: https://epsg.io/3857


