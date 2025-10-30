# 🗺️ Mapbox Tile Display - Complete Setup

## 📖 Overview

This system displays your PNG tiles from Cloudflare R2 overlaid on a Mapbox satellite basemap for each golf course client.

---

## 🎯 Quick Navigation

**New to this? Start here:**
1. 📘 [QUICK_START_MAPBOX.md](QUICK_START_MAPBOX.md) - Get up and running in 5 minutes
2. 📗 [STEP_BY_STEP_MAPBOX_GUIDE.md](STEP_BY_STEP_MAPBOX_GUIDE.md) - Detailed beginner guide
3. ✅ [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - What's been built

**Reference Documentation:**
- 📕 [MAPBOX_SETUP_GUIDE.md](MAPBOX_SETUP_GUIDE.md) - Technical details
- 📙 [R2_SETUP_GUIDE.md](R2_SETUP_GUIDE.md) - R2 bucket configuration

---

## 🚀 Three Ways to Add Tileset Metadata

### 1️⃣ Admin Dashboard (Recommended for Beginners)

```
1. Log in as admin
2. Navigate to "Upload Tiles" tab
3. Select golf course from dropdown
4. Upload JSON file or paste metadata
5. Click "Upload Tileset Metadata"
```

**Pros**: Visual interface, validation, easy to use
**Cons**: Requires admin login

---

### 2️⃣ Helper Script (Recommended for Batch Operations)

```bash
node add-tileset-metadata.js "Golf Course Name" metadata.json
```

**Example:**
```bash
node add-tileset-metadata.js "Augusta National Golf Club" augusta-metadata.json
```

**Pros**: Fast, scriptable, good for multiple courses
**Cons**: Requires Node.js and command line

---

### 3️⃣ Direct SQL (For Advanced Users)

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
  attribution,
  is_active
) VALUES (
  (SELECT id FROM golf_clubs WHERE name = 'Your Golf Course'),
  'Main Course Overlay',
  'High-resolution aerial imagery',
  33.500, 33.510, -82.030, -82.020,
  33.505, -82.025,
  14, 19, 17,
  'your-golf-course/tiles',
  '{z}/{x}/{y}.png',
  256,
  'png',
  '© Your Golf Course',
  true
);
```

**Pros**: Direct control, no dependencies
**Cons**: Requires SQL knowledge, manual validation

---

## 📋 Metadata JSON Structure

```json
{
  "name": "Display name for the tileset",
  "description": "Optional description",
  "bounds": {
    "minLat": 33.500,  // Southwest corner latitude
    "maxLat": 33.510,  // Northeast corner latitude
    "minLon": -82.030, // Southwest corner longitude
    "maxLon": -82.020  // Northeast corner longitude
  },
  "center": {
    "lat": 33.505,     // Center latitude (average of min/max)
    "lon": -82.025     // Center longitude (average of min/max)
  },
  "zoom": {
    "min": 14,         // Minimum zoom level (where tiles start)
    "max": 19,         // Maximum zoom level (highest detail)
    "default": 17      // Initial zoom when map loads
  },
  "r2FolderPath": "golf-course-name/tiles",  // Path in R2 bucket
  "tileUrlPattern": "{z}/{x}/{y}.png",       // Always this for XYZ tiles
  "tileSize": 256,                           // 256 or 512 pixels
  "format": "png",                           // png, jpg, or webp
  "attribution": "© Your Golf Course"        // Copyright text
}
```

---

## 🗂️ Required R2 File Structure

```
map-stats-tiles-prod/              ← Your R2 bucket
└── {golf-course-name}/            ← Folder per course
    └── tiles/                     ← Tiles subfolder
        ├── 14/                    ← Zoom level 14
        │   ├── 4823/              ← X coordinate
        │   │   ├── 6209.png       ← Y coordinate
        │   │   └── 6210.png
        │   └── 4824/
        │       └── 6209.png
        ├── 15/                    ← Zoom level 15
        │   └── 9646/
        │       └── 12418.png
        └── 16/                    ← Zoom level 16
            └── 19292/
                └── 24836.png
```

**Important**: 
- Folder names must be exact: `{z}/{x}/{y}.png`
- No leading zeros (use `14`, not `014`)
- File extension must match format in metadata

---

## 🔍 How to Find Your Bounds

### Method 1: Google Maps (Easiest)

1. Go to https://www.google.com/maps
2. Navigate to your golf course
3. Right-click on **southwest corner** of course
4. Click coordinates to copy (e.g., `33.500, -82.030`)
5. This is your `minLat, minLon`
6. Repeat for **northeast corner** → `maxLat, maxLon`

### Method 2: From Tile Generation

If you used GDAL to generate tiles:
```bash
# Check the metadata file
cat output-tiles/metadata.json
```

### Method 3: Estimate from Course Size

If your course is approximately 2km × 2km:
- 1 degree latitude ≈ 111 km
- 2km ≈ 0.018 degrees
- Add/subtract 0.009 from center point

---

## ✅ Setup Checklist

Before adding metadata, ensure:

- [ ] **Tiles uploaded to R2** in correct z/x/y structure
- [ ] **Tile proxy deployed**: `supabase functions deploy tile-proxy`
- [ ] **Mapbox token added** to `.env` file
- [ ] **Golf course created** in database
- [ ] **Database schema applied**: Run `tileset-metadata-schema.sql`
- [ ] **Client user assigned** to golf course

---

## 🧪 Testing Your Setup

### Step 1: Test Tile Proxy

```bash
curl "https://YOUR-SUPABASE-URL.supabase.co/functions/v1/tile-proxy/your-course/tiles/14/4823/6209.png"
```

Should return a PNG image (not an error).

### Step 2: Verify Metadata in Database

```sql
SELECT 
  gct.name,
  gc.name as golf_course,
  gct.r2_folder_path,
  gct.min_zoom,
  gct.max_zoom
FROM golf_course_tilesets gct
JOIN golf_clubs gc ON gct.golf_club_id = gc.id;
```

### Step 3: Test as Client

1. Log in as a client user
2. Navigate to dashboard
3. Map should load with Mapbox satellite base
4. Your tiles should overlay on top
5. Test zoom controls and overlay toggle

---

## 🐛 Troubleshooting Guide

### Problem: No tiles appear on map

**Checklist:**
1. Open browser console (F12) - look for 404 errors
2. Check tile URLs match your R2 structure
3. Verify `r2FolderPath` in metadata matches R2 exactly
4. Test tile proxy URL directly
5. Ensure tiles exist at the zoom levels specified

**Common Causes:**
- Wrong R2 folder path (extra/missing slashes)
- Tiles at different zoom levels than metadata
- Tile proxy not deployed

---

### Problem: Tiles in wrong location

**Checklist:**
1. Verify `minLat < maxLat` and `minLon < maxLon`
2. Check coordinates are in decimal degrees (not DMS)
3. Ensure tiles were generated with Web Mercator (EPSG:3857)
4. Verify bounds match your actual tile coverage

**Common Causes:**
- Swapped min/max values
- Wrong projection when generating tiles
- Bounds don't match tile extent

---

### Problem: Map doesn't load at all

**Checklist:**
1. Check Mapbox token is valid (starts with `pk.`)
2. Verify token is in `.env` file
3. Check user is assigned to a golf course
4. Ensure tileset exists for that golf course

**Common Causes:**
- Invalid or missing Mapbox token
- User not assigned to any golf course
- No tileset metadata for that course

---

## 📊 Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │         MapboxGolfCourseMap Component              │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  Mapbox GL Base Layer (Satellite)            │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │  Custom Tile Overlay (Your PNG Tiles)        │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                         ↓
                  Requests tiles
                         ↓
┌──────────────────────────────────────────────────────────┐
│              SUPABASE (Backend Services)                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Database: golf_course_tilesets                    │  │
│  │  - Stores metadata (bounds, zoom, R2 path)         │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Edge Function: tile-proxy                         │  │
│  │  - Receives tile request                           │  │
│  │  - Generates signed R2 URL                         │  │
│  │  - Fetches and returns PNG                         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                         ↓
                  Fetches from R2
                         ↓
┌──────────────────────────────────────────────────────────┐
│                 CLOUDFLARE R2 STORAGE                    │
│  map-stats-tiles-prod/                                   │
│    └── golf-course-name/                                 │
│        └── tiles/                                        │
│            └── 14/4823/6209.png                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 Project Files

### Core Components
- `src/components/MapboxGolfCourseMap.tsx` - Map display component
- `src/components/TilesetMetadataUploader.tsx` - Admin metadata uploader
- `src/pages/DashboardClient.tsx` - Client dashboard with map
- `src/pages/DashboardAdmin.tsx` - Admin dashboard

### Services
- `src/lib/tilesetService.ts` - Tileset metadata operations
- `src/lib/r2Service.ts` - R2 storage operations
- `supabase/functions/tile-proxy/index.ts` - Tile serving proxy

### Scripts
- `add-tileset-metadata.js` - CLI helper for adding metadata

### Documentation
- `QUICK_START_MAPBOX.md` - 5-minute setup guide
- `STEP_BY_STEP_MAPBOX_GUIDE.md` - Detailed walkthrough
- `IMPLEMENTATION_COMPLETE.md` - Implementation summary
- `MAPBOX_SETUP_GUIDE.md` - Technical reference

### Examples
- `example-tileset-metadata.json` - Pine Valley example
- `example-golf-course-metadata.json` - Template to copy

---

## 🎨 Customization

### Change Base Map Style

Edit `src/pages/DashboardClient.tsx`:
```typescript
<MapboxGolfCourseMap
  baseStyle="mapbox://styles/mapbox/satellite-v9"
/>
```

Options:
- `mapbox://styles/mapbox/satellite-v9` - Pure satellite
- `mapbox://styles/mapbox/satellite-streets-v12` - Satellite with labels (default)
- `mapbox://styles/mapbox/outdoors-v12` - Topographic
- `mapbox://styles/mapbox/streets-v12` - Street map

### Adjust Overlay Opacity

Edit `src/components/MapboxGolfCourseMap.tsx` line 130:
```typescript
'raster-opacity': 0.85  // 0.0 = transparent, 1.0 = opaque
```

---

## 🔐 Security

- **Row Level Security (RLS)**: Clients only see their golf course
- **Signed URLs**: Tile proxy generates 1-hour signed URLs
- **Admin Only**: Only admins can add/modify tileset metadata
- **Audit Trail**: All operations are logged in Supabase

---

## 🎉 You're Ready!

Start with **[QUICK_START_MAPBOX.md](QUICK_START_MAPBOX.md)** to add your first tileset.

Questions? Check the troubleshooting sections in the guides.
