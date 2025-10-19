# Step-by-Step Guide: Display Your R2 Tiles on Mapbox for Each Client

## 🎯 What You'll Achieve
By the end of this guide, each golf course client will see:
- A beautiful Mapbox satellite basemap
- Your custom PNG tiles overlaid on top (from R2 bucket)
- Properly aligned tiles based on the metadata you stored in Supabase

---

## 📋 Prerequisites Checklist

Before starting, make sure you have:

- ✅ PNG tiles uploaded to R2 bucket in `z/x/y` hierarchy (e.g., `golf-course-name/tiles/14/4823/6209.png`)
- ✅ Metadata for those tiles in Supabase database (bounds, zoom levels, etc.)
- ✅ Mapbox account with access token
- ✅ Supabase edge function `tile-proxy` deployed (you already have this!)
- ✅ Golf courses created in your database

---

## 🗺️ Understanding the Architecture

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT BROWSER                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Mapbox GL Map Component                           │ │
│  │  ├── Base Layer: Mapbox Satellite                 │ │
│  │  └── Overlay: Your Custom Tiles                   │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                    ↓ Requests tiles
┌─────────────────────────────────────────────────────────┐
│  SUPABASE EDGE FUNCTION (tile-proxy)                    │
│  - Receives tile request: /tile-proxy/{course}/14/4/6   │
│  - Fetches from R2 with signed URL                      │
│  - Returns PNG tile to browser                          │
└─────────────────────────────────────────────────────────┘
                    ↓ Fetches from
┌─────────────────────────────────────────────────────────┐
│  CLOUDFLARE R2 BUCKET                                   │
│  map-stats-tiles-prod/                                  │
│    └── golf-course-name/                                │
│        └── tiles/                                       │
│            └── 14/4823/6209.png                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Step 1: Verify Your Tile Structure in R2

Your tiles **MUST** be organized like this in R2:

```
map-stats-tiles-prod/
└── {golf-course-name}/
    └── tiles/
        ├── 14/              ← Zoom level
        │   └── 4823/        ← X coordinate
        │       ├── 6209.png ← Y coordinate
        │       └── 6210.png
        ├── 15/
        │   └── 9646/
        │       └── 12418.png
        └── 16/
            └── 19292/
                └── 24836.png
```

**Example**: If you have a golf course called "augusta-national", your path would be:
- `augusta-national/tiles/14/4823/6209.png`
- `augusta-national/tiles/15/9646/12418.png`

---

## 📝 Step 2: Get Your Mapbox Access Token

1. Go to https://account.mapbox.com/
2. Sign up or log in
3. Navigate to "Access tokens"
4. Copy your default public token (starts with `pk.`)
5. Add it to your `.env` file:

```env
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsZjh4eXo5ZjBhZmczZm1rYnN5ZGRoZmwifQ.your-token-here
```

---

## 📝 Step 3: Prepare Your Tileset Metadata

For each golf course, you need to know:

### A. Geographic Bounds
- **Minimum Latitude** (southernmost point)
- **Maximum Latitude** (northernmost point)
- **Minimum Longitude** (westernmost point)
- **Maximum Longitude** (easternmost point)

**How to find these:**
1. Go to https://www.google.com/maps
2. Navigate to your golf course
3. Right-click on the corners of the course
4. Note the coordinates (format: `39.9875, -74.955`)

### B. Center Point
- The center of your golf course (for initial map view)
- Calculate as: `(minLat + maxLat) / 2` and `(minLon + maxLon) / 2`

### C. Zoom Levels
- **Min Zoom**: Lowest zoom level where you have tiles (usually 12-14)
- **Max Zoom**: Highest zoom level where you have tiles (usually 18-20)
- **Default Zoom**: Initial zoom when map loads (usually 16-17)

### D. R2 Folder Path
- The path to your tiles in R2 (e.g., `augusta-national/tiles`)

---

## 📝 Step 4: Create a Metadata JSON File

Create a file called `{golf-course-name}-metadata.json`:

```json
{
  "name": "Augusta National Golf Club - Main Course",
  "description": "High-resolution aerial imagery of the championship course",
  "bounds": {
    "minLat": 33.500,
    "maxLat": 33.510,
    "minLon": -82.030,
    "maxLon": -82.020
  },
  "center": {
    "lat": 33.505,
    "lon": -82.025
  },
  "zoom": {
    "min": 14,
    "max": 19,
    "default": 17
  },
  "r2FolderPath": "augusta-national/tiles",
  "tileUrlPattern": "{z}/{x}/{y}.png",
  "tileSize": 256,
  "format": "png",
  "attribution": "© Augusta National Golf Club"
}
```

**Replace the values** with your actual golf course data!

---

## 📝 Step 5: Add Metadata to Supabase Database

### Option A: Using the Helper Script (Easiest)

I'll create a helper script for you in the next step.

### Option B: Manual SQL Insert

1. Go to Supabase Dashboard → SQL Editor
2. Run this query (replace values with your data):

```sql
-- First, get your golf club ID
SELECT id, name FROM public.golf_clubs;

-- Then insert the tileset metadata
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
  attribution,
  is_active
) VALUES (
  'YOUR-GOLF-CLUB-UUID-HERE',  -- Replace with actual UUID from first query
  'Main Course Overlay',
  'High-resolution aerial imagery',
  33.500, 33.510, -82.030, -82.020,  -- Bounds
  33.505, -82.025,  -- Center
  14, 19, 17,  -- Zoom levels (min, max, default)
  'augusta-national/tiles',  -- R2 folder path
  '{z}/{x}/{y}.png',  -- Tile URL pattern
  256,  -- Tile size
  'png',  -- Format
  '© Augusta National Golf Club',  -- Attribution
  true  -- Is active
);
```

---

## 📝 Step 6: Verify Tile Proxy is Deployed

Check if your tile-proxy function is working:

```bash
# Test the tile proxy
curl "https://YOUR-SUPABASE-URL.supabase.co/functions/v1/tile-proxy/augusta-national/tiles/14/4823/6209.png"
```

If you get a PNG image back, it's working! ✅

If not deployed, run:
```bash
supabase functions deploy tile-proxy
```

---

## 📝 Step 7: Update Client Dashboard to Show Map

The map component is already created (`MapboxGolfCourseMap.tsx`). You just need to add it to the client dashboard.

I'll update the client dashboard in the next step to include the map.

---

## 📝 Step 8: Test the Complete Flow

1. **Log in as a client** for a specific golf course
2. **Navigate to the dashboard**
3. **You should see**:
   - Mapbox satellite basemap
   - Your custom tiles overlaid on top
   - Zoom controls
   - Toggle to show/hide overlay

---

## 🔧 Troubleshooting

### Problem: Map loads but no tiles appear

**Check:**
1. Browser console for 404 errors
2. Tile URLs being generated correctly
3. R2 folder path matches exactly what's in your bucket
4. Tile coordinates match Web Mercator projection

**Solution:**
```javascript
// Open browser console and check the network tab
// Look for requests to /tile-proxy/
// Verify the URLs match your R2 structure
```

### Problem: Tiles appear in wrong location

**Check:**
1. Bounds are correct (minLat < maxLat, minLon < maxLon)
2. Center point is within bounds
3. Tiles were generated with correct projection (Web Mercator EPSG:3857)

### Problem: Tiles are blurry or pixelated

**Check:**
1. Zoom levels - you might be zooming beyond max_zoom
2. Tile size - try 512px instead of 256px
3. Original image resolution

---

## 🎨 Customization Options

### Change Base Map Style

```typescript
<MapboxGolfCourseMap
  golfClubId={clubId}
  mapboxAccessToken={token}
  baseStyle="mapbox://styles/mapbox/satellite-v9"  // Different style
/>
```

Available styles:
- `mapbox://styles/mapbox/satellite-v9` - Pure satellite
- `mapbox://styles/mapbox/satellite-streets-v12` - Satellite with labels (default)
- `mapbox://styles/mapbox/outdoors-v12` - Topographic
- `mapbox://styles/mapbox/streets-v12` - Street map

### Adjust Overlay Opacity

Edit `MapboxGolfCourseMap.tsx` line 130:
```typescript
paint: {
  'raster-opacity': 0.85  // Change to 0.5 for more transparent, 1.0 for opaque
}
```

---

## 📚 Next Steps

1. ✅ Add metadata for all your golf courses
2. ✅ Update client dashboard to show map
3. ✅ Create admin interface to upload metadata easily
4. ✅ Add multiple tilesets per course (e.g., different seasons)
5. ✅ Add markers for holes, hazards, etc.

---

## 🆘 Need Help?

Common issues and solutions:

1. **"No tileset found"** → Check golf_club_id matches in database
2. **"Tile not found"** → Verify R2 folder path and tile structure
3. **"Map not loading"** → Check Mapbox token is valid
4. **"Tiles in wrong place"** → Verify bounds and projection

---

## 📖 Additional Resources

- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [XYZ Tile Specification](https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames)
- [Web Mercator Projection](https://epsg.io/3857)
- [GDAL Tile Generation](https://gdal.org/programs/gdal2tiles.html)
