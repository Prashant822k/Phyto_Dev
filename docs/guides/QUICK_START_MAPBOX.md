# Quick Start: Display Your R2 Tiles on Mapbox

This is a simplified guide to get your tiles showing on the map **as quickly as possible**.

## ✅ What You Already Have

1. ✅ PNG tiles uploaded to R2 in `z/x/y` structure
2. ✅ Metadata in Supabase database
3. ✅ Tile proxy function deployed
4. ✅ Mapbox component ready to use

## 🚀 Quick Setup (5 Minutes)

### Step 1: Add Mapbox Token to .env

```env
VITE_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGY4eHl6OWYwYWZnM2Zta2JzeWRkaGZsIn0.your-token
```

Get your token from: https://account.mapbox.com/access-tokens/

### Step 2: Add Tileset Metadata

You have **3 options**:

#### Option A: Use the Admin Dashboard (Easiest)

1. Log in as admin
2. Go to "Upload Tiles" tab
3. Select your golf course
4. Upload or paste your metadata JSON
5. Click "Upload Tileset Metadata"

#### Option B: Use the Helper Script

```bash
node add-tileset-metadata.js "Your Golf Course Name" your-metadata.json
```

#### Option C: Manual SQL Insert

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
  'YOUR-GOLF-CLUB-UUID',
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

### Step 3: Test It!

1. Log in as a **client user** (not admin)
2. You should see the map on your dashboard
3. Your tiles should be overlaid on the Mapbox satellite basemap

## 📊 Metadata JSON Template

Create a file called `{golf-course-name}-metadata.json`:

```json
{
  "name": "Your Golf Course - Main Course",
  "description": "High-resolution aerial imagery",
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
  "r2FolderPath": "your-golf-course/tiles",
  "tileUrlPattern": "{z}/{x}/{y}.png",
  "tileSize": 256,
  "format": "png",
  "attribution": "© Your Golf Course"
}
```

### How to Fill This Out:

1. **name**: Display name for the tileset
2. **bounds**: Geographic boundaries of your tiles
   - Find these using Google Maps (right-click → coordinates)
   - minLat/minLon = southwest corner
   - maxLat/maxLon = northeast corner
3. **center**: Center point of your course
   - Calculate: `(minLat + maxLat) / 2`, `(minLon + maxLon) / 2`
4. **zoom**: Zoom levels where you have tiles
   - Check your R2 bucket folders (14, 15, 16, etc.)
5. **r2FolderPath**: Path in R2 (e.g., `augusta-national/tiles`)
6. **tileUrlPattern**: Always `{z}/{x}/{y}.png` for standard XYZ tiles

## 🔍 How to Find Your Bounds

### Method 1: Google Maps
1. Go to https://www.google.com/maps
2. Navigate to your golf course
3. Right-click on the **southwest corner** → note coordinates (minLat, minLon)
4. Right-click on the **northeast corner** → note coordinates (maxLat, maxLon)

### Method 2: Use Your Tiles
If you generated tiles with GDAL, check the output folder for `metadata.json` or `tilemapresource.xml`

### Method 3: Estimate
If your course is roughly 2km x 2km:
- 1 degree latitude ≈ 111km
- 1 degree longitude ≈ 111km × cos(latitude)
- So 2km ≈ 0.018 degrees

## ✅ Verification Checklist

Before testing, verify:

- [ ] Tiles are in R2 at `{golf-course-name}/tiles/z/x/y.png`
- [ ] Metadata is in database (`SELECT * FROM golf_course_tilesets`)
- [ ] Mapbox token is in `.env` file
- [ ] User is assigned to the golf course
- [ ] Tile proxy function is deployed

## 🐛 Troubleshooting

### Map shows but no tiles appear

**Check 1: Browser Console**
- Open Developer Tools (F12)
- Look for 404 errors on tile requests
- Verify the URLs match your R2 structure

**Check 2: R2 Folder Path**
```sql
SELECT r2_folder_path, tile_url_pattern FROM golf_course_tilesets;
```
Should match exactly: `your-course/tiles` (no leading/trailing slashes)

**Check 3: Test Tile Proxy**
```
https://YOUR-SUPABASE-URL.supabase.co/functions/v1/tile-proxy/your-course/tiles/14/4823/6209.png
```
Should return a PNG image

### Map doesn't load at all

**Check 1: Mapbox Token**
- Verify token is in `.env` file
- Token should start with `pk.`
- Check browser console for Mapbox errors

**Check 2: User Assignment**
```sql
SELECT u.email, u.club_id, gc.name 
FROM users u 
LEFT JOIN golf_clubs gc ON u.club_id = gc.id 
WHERE u.email = 'your-client@email.com';
```

### Tiles appear in wrong location

**Check 1: Bounds**
- Verify minLat < maxLat
- Verify minLon < maxLon
- Bounds should be in decimal degrees (not DMS)

**Check 2: Projection**
- Tiles must be in Web Mercator (EPSG:3857)
- If using GDAL, ensure you used `--xyz` flag

## 📁 File Structure Reference

Your R2 bucket should look like this:

```
map-stats-tiles-prod/
├── augusta-national/
│   └── tiles/
│       ├── 14/
│       │   ├── 4823/
│       │   │   ├── 6209.png
│       │   │   └── 6210.png
│       │   └── 4824/
│       │       └── 6209.png
│       ├── 15/
│       │   └── 9646/
│       │       └── 12418.png
│       └── 16/
│           └── 19292/
│               └── 24836.png
└── pine-valley/
    └── tiles/
        └── ...
```

## 🎯 Testing Steps

1. **Test as Admin**
   ```
   - Log in as admin
   - Go to "Upload Tiles" tab
   - Upload metadata
   - Should see success message
   ```

2. **Test as Client**
   ```
   - Log out
   - Log in as client user
   - Should see dashboard with map
   - Map should show Mapbox satellite base
   - Your tiles should overlay on top
   ```

3. **Test Controls**
   ```
   - Zoom in/out
   - Pan around
   - Toggle overlay on/off
   - Reset view
   ```

## 📞 Need More Help?

- **Detailed Guide**: See `STEP_BY_STEP_MAPBOX_GUIDE.md`
- **Mapbox Setup**: See `MAPBOX_SETUP_GUIDE.md`
- **R2 Setup**: See `R2_SETUP_GUIDE.md`

## 🎉 Success!

If you can see your tiles overlaid on the Mapbox satellite map, you're done! 

Each client will now see their golf course with custom tiles when they log in.
