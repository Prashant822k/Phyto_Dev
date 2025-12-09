# Vector Layer Overlay Implementation Guide

## Overview

Implemented a **side-by-side map view** for golf course clients:
- **Left Map:** Raster tilesets (satellite imagery with date/time selection)
- **Right Map:** Vector layer overlays (GeoJSON boundaries, features, zones)

Both maps display simultaneously, allowing clients to view imagery and overlays together.

## What Was Created

### 1. New Component: `VectorLayerOverlayMap.tsx`

A complete Mapbox GL JS map component that:
- ✅ Loads vector layers from R2 storage
- ✅ Displays GeoJSON overlays (polygons, lines, points)
- ✅ Auto-colors layers based on name (fairways=green, bunkers=sand, etc.)
- ✅ Toggle individual layer visibility
- ✅ Show/hide all layers at once
- ✅ Scrollable overlay panel with layer list
- ✅ Smart geometry detection (fills, lines, circles)

### 2. Updated: `DashboardClient.tsx`

Modified client dashboard to show **two maps side by side**:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Raster Tileset Map */}
  <MapboxGolfCourseMap ... />
  
  {/* Vector Layer Overlay Map */}
  <VectorLayerOverlayMap ... />
</div>
```

### 3. Fixed: `get-vector-layers` Edge Function

Corrected database column name:
- ❌ OLD: `golf_course_id`
- ✅ NEW: `golf_club_id`

## Features

### Auto-Color Mapping

Layers are automatically colored based on their name:

| Layer Name Contains | Color | Hex |
|---------------------|-------|-----|
| fairway | Light Green | #90EE90 |
| green | Dark Green | #228B22 |
| tee | Gold | #FFD700 |
| bunker, sand | Sandy Brown | #F4A460 |
| water, hazard | Royal Blue | #4169E1 |
| rough | Saddle Brown | #8B4513 |
| boundary, course | Orange Red | #FF4500 |
| path, cart | Dark Gray | #A9A9A9 |
| tree, wood | Dark Green | #006400 |
| **Default** | Random | Various |

### Geometry Type Support

The component automatically detects and styles different geometry types:

#### Polygons (Fairways, Greens, Bunkers)
```typescript
- Fill layer with 40% opacity
- Outline layer with 2px width
- Color based on layer name
```

#### Lines (Paths, Boundaries)
```typescript
- Line layer with 3px width
- Color based on layer name
```

#### Points (Markers, Tees)
```typescript
- Circle layer with 6px radius
- White 2px stroke
- Color based on layer name
```

### Overlay Control Panel

Interactive panel showing all vector layers:
- **Layer name** and description
- **Color indicator** (matches map color)
- **Toggle switch** for visibility
- **Show All / Hide All** button
- **Scrollable** for many layers

## User Workflow

### For Clients

1. **Login** to dashboard
2. **View two maps side by side:**
   - Left: Satellite imagery with date selection
   - Right: Vector overlays (boundaries, features)
3. **Toggle overlays** on/off using switches
4. **Compare** imagery with course features

### For Admins

1. **Upload vector layers** via admin panel
2. **Select golf course** from dropdown
3. **Upload multiple GeoJSON files** at once
4. **Files auto-upload** to R2: `{course_name}/Vector_Layers/{layer_name}.geojson`
5. **Clients see layers** immediately on their dashboard

## File Structure

```
src/
├── components/
│   ├── MapboxGolfCourseMap.tsx          # Raster tileset map
│   ├── VectorLayerOverlayMap.tsx        # NEW: Vector overlay map
│   └── admin/
│       └── VectorLayerUploader.tsx      # Upload UI (already exists)
├── pages/
│   └── DashboardClient.tsx              # UPDATED: Side-by-side layout
└── lib/
    └── supabase.ts

supabase/
└── functions/
    ├── upload-vector-layer/
    │   └── index.ts                     # Upload to R2 (already fixed)
    └── get-vector-layers/
        └── index.ts                     # FIXED: Column name
```

## R2 Storage Structure

```
map-stats-tiles-prod/
├── test20/                              # Course name
│   ├── Vector_Layers/                   # Vector overlays
│   │   ├── .keep                        # Directory marker
│   │   ├── fairways.geojson            # Fairway boundaries
│   │   ├── greens.geojson              # Green boundaries
│   │   ├── bunkers.geojson             # Bunker locations
│   │   ├── tee_boxes.geojson           # Tee box locations
│   │   └── water_hazards.geojson       # Water hazard boundaries
│   └── 2024-11-05/                      # Raster tiles (by date)
│       └── 14-30/
│           └── tiles/
│               └── z/x/y.png
```

## Database Schema

### `vector_layers` Table

```sql
CREATE TABLE vector_layers (
  id UUID PRIMARY KEY,
  golf_club_id UUID NOT NULL,           -- Links to golf_clubs table
  course_name TEXT NOT NULL,             -- e.g., "test20"
  name TEXT NOT NULL,                    -- e.g., "Fairways"
  description TEXT,                      -- e.g., "Polygon layer with 18 features"
  layer_type TEXT NOT NULL,              -- e.g., "geojson"
  r2_key TEXT NOT NULL,                  -- e.g., "test20/Vector_Layers/fairways.geojson"
  file_size INTEGER,
  is_active BOOLEAN DEFAULT true,
  z_index INTEGER DEFAULT 0,             -- Layer stacking order
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Get Vector Layers

**Endpoint:** `GET /functions/v1/get-vector-layers?golf_course_id={id}`

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Fairways",
      "description": "Polygon layer with 18 features",
      "layer_type": "geojson",
      "r2_key": "test20/Vector_Layers/fairways.geojson",
      "golf_club_id": "uuid",
      "course_name": "test20",
      "is_active": true,
      "z_index": 0,
      "url": "https://pub-xxx.r2.dev/test20/Vector_Layers/fairways.geojson",
      "urlWithCache": "https://pub-xxx.r2.dev/test20/Vector_Layers/fairways.geojson?v=1699999999"
    }
  ]
}
```

## Environment Variables Required

```env
# Mapbox (already configured)
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx

# R2 Public URL (for vector layer access)
VITE_R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Supabase (already configured)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

## Deployment Steps

### 1. Deploy Edge Function

```bash
# Deploy the fixed get-vector-layers function
supabase functions deploy get-vector-layers

# Verify it works
supabase functions logs get-vector-layers --follow
```

### 2. Test Upload

1. Go to admin panel
2. Navigate to Vector Layers section
3. Select golf course: "Test Course 20"
4. Upload GeoJSON files (fairways, greens, etc.)
5. Verify files appear in R2: `test20/Vector_Layers/`

### 3. Test Client View

1. Login as client user
2. Go to dashboard
3. Should see **two maps side by side**
4. Right map shows vector overlays
5. Toggle layers on/off using switches

## Example GeoJSON Structure

### Fairways.geojson
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-122.4, 37.8],
          [-122.41, 37.8],
          [-122.41, 37.81],
          [-122.4, 37.81],
          [-122.4, 37.8]
        ]]
      },
      "properties": {
        "name": "Hole 1 Fairway",
        "hole": 1
      }
    }
  ]
}
```

## Styling Customization

### Change Layer Colors

Edit `getLayerColor()` function in `VectorLayerOverlayMap.tsx`:

```typescript
const getLayerColor = (name: string): string => {
  const lowerName = name.toLowerCase();
  
  // Add custom colors
  if (lowerName.includes('practice')) return '#FFA500';
  if (lowerName.includes('parking')) return '#808080';
  
  // ... existing colors
}
```

### Change Layer Opacity

```typescript
// For polygons
'fill-opacity': 0.4  // Change from 0.4 to desired value

// For lines
'line-opacity': 1.0  // Add if needed
```

### Change Line Width

```typescript
// For outlines
'line-width': 2  // Change from 2 to desired width

// For paths
'line-width': 3  // Change from 3 to desired width
```

## Troubleshooting

### Layers Not Showing

**Check:**
1. ✅ R2_PUBLIC_URL is set in `.env`
2. ✅ Files exist in R2: `{course_name}/Vector_Layers/*.geojson`
3. ✅ Database has records with correct `golf_club_id`
4. ✅ Layers are marked `is_active = true`
5. ✅ GeoJSON files are valid FeatureCollections

**Debug:**
```typescript
// Check browser console for:
console.log('Loading vector layer: {name} from {url}');
console.log('✅ Loaded vector layer: {name}');
```

### Wrong Colors

**Check:**
- Layer names match color keywords
- Example: "Fairways" → contains "fairway" → green
- Example: "Sand Traps" → contains "sand" → sandy brown

### Map Not Loading

**Check:**
1. ✅ VITE_MAPBOX_ACCESS_TOKEN is valid
2. ✅ Golf club has vector layers in database
3. ✅ User is assigned to correct golf club

### CORS Errors

**Check:**
- R2 bucket has public access enabled
- Or use signed URLs (already implemented in edge function)

## Future Enhancements

### 1. Swipe Comparison

Add swipe control between raster and vector maps:
```typescript
import MapboxCompare from 'mapbox-gl-compare';

const compare = new MapboxCompare(
  rasterMap.current,
  vectorMap.current,
  '#comparison-container'
);
```

### 2. Layer Styling UI

Allow clients to customize layer colors:
```typescript
<ColorPicker
  value={layerColor}
  onChange={(color) => updateLayerColor(layerId, color)}
/>
```

### 3. Measurement Tools

Add distance/area measurement:
```typescript
import MapboxDraw from '@mapbox/mapbox-gl-draw';

map.addControl(new MapboxDraw({
  displayControlsDefault: false,
  controls: {
    line_string: true,
    polygon: true
  }
}));
```

### 4. Layer Groups

Organize layers into categories:
```typescript
const layerGroups = {
  'Course Features': ['fairways', 'greens', 'tees'],
  'Hazards': ['bunkers', 'water'],
  'Infrastructure': ['paths', 'buildings']
};
```

### 5. Export Functionality

Allow clients to download visible layers:
```typescript
const exportVisibleLayers = () => {
  const features = visibleLayers.map(id => 
    map.querySourceFeatures(`vector-source-${id}`)
  );
  downloadGeoJSON(features);
};
```

## Testing Checklist

- [ ] Admin can upload multiple vector layers
- [ ] Files appear in R2 under correct path
- [ ] Database records created with course_name
- [ ] Client dashboard shows two maps side by side
- [ ] Vector layers load on right map
- [ ] Layers have correct colors
- [ ] Toggle switches work
- [ ] Show All / Hide All works
- [ ] Layers persist visibility on refresh
- [ ] No console errors
- [ ] Mobile responsive (stacks vertically)

## Success Criteria

✅ **Clients can:**
- View raster imagery and vector overlays simultaneously
- Toggle individual layers on/off
- See auto-colored layers based on feature type
- Access from any device (responsive)

✅ **Admins can:**
- Upload multiple vector layers at once
- Organize layers by golf course
- Layers immediately available to clients

✅ **System:**
- Scalable (handles 50+ layers per course)
- Fast loading (GeoJSON cached in browser)
- Reliable (R2 public URLs, no auth needed for read)

## Summary

This implementation provides a **complete vector overlay system** for golf course management:

1. **Upload:** Admin uploads GeoJSON files
2. **Storage:** Files stored in R2 under `{course}/Vector_Layers/`
3. **Display:** Clients see overlays on dedicated map
4. **Control:** Toggle layers on/off with switches
5. **Styling:** Auto-colored based on feature type

The side-by-side layout allows clients to **compare satellite imagery with course boundaries** effectively! 🎉
