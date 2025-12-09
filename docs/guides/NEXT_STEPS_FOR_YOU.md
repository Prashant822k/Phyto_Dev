# ✅ Metadata Uploaded! Next Steps to See Your Map

## What You've Done ✓
- ✅ Uploaded tileset metadata for "The Best Golf"
- ✅ Added Mapbox token to `.env` file
- ✅ Tiles are in R2 bucket

---

## 🎯 What You Need to Do Now

### Step 1: Verify R2 Folder Structure

Your tiles in R2 **MUST** be organized exactly like this:

```
map-stats-tiles-prod/              ← Your R2 bucket name
└── the-best-golf/                 ← Auto-generated from "The Best Golf"
    └── tiles/                     ← MUST have this "tiles" subfolder
        ├── 14/                    ← Zoom level 14
        │   ├── 8456/              ← X coordinate (example)
        │   │   ├── 5432.png       ← Y coordinate (example)
        │   │   └── 5433.png
        │   └── 8457/
        │       └── 5432.png
        ├── 15/                    ← Zoom level 15
        │   └── 16912/
        │       └── 10864.png
        ├── 16/
        ├── 17/
        ├── 18/
        ├── 19/
        └── 20/                    ← Up to zoom level 20
```

**Important Notes:**
- The folder name `the-best-golf` was auto-generated from your course name
- You MUST have a `tiles` subfolder
- Zoom folders must be numbers: `14`, `15`, `16`, etc. (not `014`)
- File structure: `{z}/{x}/{y}.png`

**If your structure is different**, you have two options:
1. **Reorganize your R2 files** to match the structure above
2. **Update the metadata** with the correct `r2FolderPath`

---

### Step 2: Assign a Client User to "The Best Golf"

1. **Log in as admin**
2. **Go to "Manage Users" tab**
3. **Find or create a client user**
4. **Assign them to "The Best Golf" golf club**

**SQL Alternative** (if you prefer):
```sql
-- Find the golf club ID
SELECT id, name FROM golf_clubs WHERE name = 'The Best Golf';

-- Assign user to club
UPDATE users 
SET club_id = 'YOUR-GOLF-CLUB-UUID-HERE'
WHERE email = 'client@example.com';
```

---

### Step 3: Test as Client User

1. **Log out** from admin account
2. **Log in as the client user** you assigned
3. **You should see**:
   - Dashboard with a map
   - Mapbox satellite basemap
   - Your tiles overlaid on top (if R2 structure is correct)

---

## 🔍 Troubleshooting

### Problem: Map shows but no tiles appear

**Check 1: Browser Console**
1. Press F12 to open Developer Tools
2. Go to "Console" tab
3. Look for errors like:
   - `404 Not Found` → Tiles not in R2 at expected path
   - `Failed to fetch` → Tile proxy issue

**Check 2: Network Tab**
1. Press F12 → "Network" tab
2. Reload the page
3. Look for requests to `/tile-proxy/`
4. Check the URLs - they should look like:
   ```
   https://your-project.supabase.co/functions/v1/tile-proxy/the-best-golf/tiles/14/8456/5432.png
   ```
5. Click on a failed request to see the error

**Check 3: Verify R2 Path**
```sql
SELECT 
  name,
  r2_folder_path,
  tile_url_pattern,
  min_zoom,
  max_zoom
FROM golf_course_tilesets
WHERE name LIKE '%Best Golf%';
```

Should show:
- `r2_folder_path`: `the-best-golf/tiles`
- `tile_url_pattern`: `{z}/{x}/{y}.png`

---

### Problem: Map doesn't load at all

**Check 1: User Assignment**
```sql
SELECT 
  u.email,
  u.club_id,
  gc.name as golf_club_name
FROM users u
LEFT JOIN golf_clubs gc ON u.club_id = gc.id
WHERE u.email = 'your-client@example.com';
```

User must have a `club_id` assigned.

**Check 2: Mapbox Token**
- Open browser console
- Look for Mapbox errors
- Token should start with `pk.`

---

### Problem: Tiles in wrong location

**Check:** Your tiles must be generated with **Web Mercator projection (EPSG:3857)**

If you used GDAL to generate tiles, you should have used:
```bash
gdal2tiles.py --xyz --zoom=14-20 input.tif output/
```

The `--xyz` flag ensures Web Mercator projection.

---

## 📊 What the System Does Automatically

When a client logs in:

1. **Fetches their golf club ID** from the database
2. **Queries for tileset metadata** for that club
3. **Initializes Mapbox** with satellite basemap
4. **Adds tile overlay** using the tile-proxy function
5. **Tile proxy**:
   - Receives request: `/tile-proxy/the-best-golf/tiles/14/8456/5432.png`
   - Generates signed R2 URL
   - Fetches PNG from R2
   - Returns to browser

---

## 🎯 Expected Result

When everything is working, the client should see:

```
┌─────────────────────────────────────────────┐
│  Welcome to The Best Golf                   │
│  View your course map and processed imagery │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │                                       │ │
│  │     [Mapbox Satellite Basemap]       │ │
│  │                                       │ │
│  │     [Your Tiles Overlaid on Top]     │ │
│  │                                       │ │
│  │  [Zoom Controls] [Toggle Overlay]    │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│  Processed Imagery                          │
│  [Image thumbnails if any]                  │
└─────────────────────────────────────────────┘
```

---

## 🔧 Quick Verification Commands

### Check if metadata exists:
```sql
SELECT * FROM golf_course_tilesets WHERE name LIKE '%Best Golf%';
```

### Check if user is assigned:
```sql
SELECT u.email, gc.name 
FROM users u 
JOIN golf_clubs gc ON u.club_id = gc.id 
WHERE gc.name = 'The Best Golf';
```

### Test tile proxy directly:
```bash
# Replace with your actual Supabase URL and a tile that exists in R2
curl "https://YOUR-PROJECT.supabase.co/functions/v1/tile-proxy/the-best-golf/tiles/14/8456/5432.png" --output test-tile.png
```

If this downloads a PNG file, the proxy is working!

---

## 📝 Summary

**You need to:**
1. ✅ Verify R2 folder structure: `the-best-golf/tiles/{z}/{x}/{y}.png`
2. ✅ Assign a client user to "The Best Golf" club
3. ✅ Log in as that client user
4. ✅ See the map with your tiles!

**If tiles don't appear:**
- Check browser console (F12)
- Verify R2 folder structure matches exactly
- Test tile proxy URL directly

---

## 🆘 Still Stuck?

1. Check browser console for errors
2. Verify R2 folder structure
3. Test a tile URL directly in browser
4. Check the troubleshooting sections in QUICK_START_MAPBOX.md

Good luck! 🎉
