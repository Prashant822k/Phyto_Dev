# Tile Loading Debug Guide - test21 Not Showing

## 🔍 Problem
- **test20** tiles load correctly (green orthomosaic visible)
- **test21** tiles don't load (only satellite imagery visible)
- Both have correct metadata in database
- Tiles exist in R2 storage

## 📊 Database Comparison

### test20 (WORKING)
```json
{
  "id": "a0bb4617-bfa1-4dc8-bce9-34053b5fb00d",
  "golf_club_id": "4fe11be9-b17b-4070-b790-19bd0c0f2b9b",
  "name": "test20",
  "r2_folder_path": "test20/2025-11-05/09-30/tiles",
  "flight_date": "2025-11-05",
  "flight_time": "09:30:00"
}
```

### test21 (NOT WORKING)
```json
{
  "id": "89713b44-b261-48c8-bd72-2542a1339239",
  "golf_club_id": "8028430f-500a-4144-980a-bb82089f3b74",
  "name": "test21",
  "r2_folder_path": "test21/2025-11-24/17-30/tiles",
  "flight_date": "2025-11-24",
  "flight_time": "17:30:00"
}
```

## 🔧 Debugging Steps

### Step 1: Check Browser Console

Open browser console (F12) and look for these logs when loading test21:

```javascript
// Should see:
🗺️ Updating layers...
  Selected layers: ["89713b44-b261-48c8-bd72-2542a1339239"]
  Available tilesets: 1
  Supabase URL: https://...supabase.co
  Adding 1 layers...
  ✅ Adding layer: test21 (2025-11-24)
     Source ID: tileset-source-89713b44-b261-48c8-bd72-2542a1339239
     Layer ID: tileset-layer-89713b44-b261-48c8-bd72-2542a1339239
     R2 Path: test21/2025-11-24/17-30/tiles
     Tile URL: https://...supabase.co/functions/v1/tile-proxy?tilesetId=89713b44-b261-48c8-bd72-2542a1339239&z=15&x=5242&y=12663&token=...
     Bounds: [5.755898, 51.361755, 5.779088, 51.372146]
     Zoom: 14 - 20
     ✅ Layer added successfully
✅ Layer update complete
```

### Step 2: Check Network Tab

1. Open Network tab in browser DevTools
2. Filter by "tile-proxy"
3. Look for tile requests
4. Check if they return:
   - ✅ **200 OK** with image data (working)
   - ❌ **200 OK** with transparent PNG (not working - fallback)
   - ❌ **404** or **500** (error)

### Step 3: Check Tile URL

Copy a tile URL from the console and test it directly:

```
https://YOUR_SUPABASE_URL/functions/v1/tile-proxy?tilesetId=89713b44-b261-48c8-bd72-2542a1339239&z=15&x=16774&y=10893&token=YOUR_TOKEN
```

Expected responses:
- **Working**: Returns PNG image data
- **Not working**: Returns transparent 1x1 PNG (fallback)

### Step 4: Check Edge Function Logs

Go to Supabase Dashboard → Edge Functions → tile-proxy → Logs

Look for:
```
tile-proxy - Fetching tile: test21/2025-11-24/17-30/tiles/15/16774/10893.png
tile-proxy - r2_folder_path: test21/2025-11-24/17-30/tiles
tile-proxy - tile_url_pattern: {z}/{x}/{y}.png
tile-proxy - z/x/y: 15 16774 10893
```

If you see:
```
tile-proxy - Tile fetch failed: 404 Not Found
tile-proxy - Request key: test21/2025-11-24/17-30/tiles/15/16774/10893.png
```

Then the tile doesn't exist at that path in R2.

### Step 5: Verify R2 Storage

Check if tiles actually exist in R2:

**Expected path in R2:**
```
test21/2025-11-24/17-30/tiles/14/8387/5446.png
test21/2025-11-24/17-30/tiles/15/16774/10893.png
test21/2025-11-24/17-30/tiles/16/33548/21786.png
...
test21/2025-11-24/17-30/tiles/20/536777/348586.png
```

**Check via Cloudflare R2 Dashboard:**
1. Go to Cloudflare Dashboard
2. Navigate to R2 → Your bucket
3. Browse to `test21/2025-11-24/17-30/tiles/`
4. Verify folders 14, 15, 16... 20 exist
5. Check a few tiles exist inside

## 🐛 Common Issues

### Issue 1: Wrong R2 Path
**Symptom**: Tiles return 404 in edge function logs

**Possible causes:**
- Tiles uploaded to wrong path (e.g., `test21/tiles/` instead of `test21/2025-11-24/17-30/tiles/`)
- Date/time format mismatch
- Typo in folder name

**Fix:**
```sql
-- Check actual r2_folder_path in database
SELECT id, name, r2_folder_path, flight_date, flight_time 
FROM golf_course_tilesets 
WHERE name = 'test21';

-- If path is wrong, update it:
UPDATE golf_course_tilesets 
SET r2_folder_path = 'test21/2025-11-24/17-30/tiles'
WHERE id = '89713b44-b261-48c8-bd72-2542a1339239';
```

### Issue 2: Tiles Not Uploaded
**Symptom**: R2 folder is empty or doesn't exist

**Fix:** Re-upload tiles to correct path using TileUploader

### Issue 3: Wrong Tile Coordinates
**Symptom**: Some tiles load, others don't

**Possible cause:** Bounds in database don't match actual tile coverage

**Fix:**
```sql
-- Verify bounds match test20 (since they're the same location)
SELECT name, min_lat, max_lat, min_lon, max_lon 
FROM golf_course_tilesets 
WHERE name IN ('test20', 'test21');

-- Update if needed:
UPDATE golf_course_tilesets 
SET 
  min_lat = 51.361755,
  max_lat = 51.372146,
  min_lon = 5.755898,
  max_lon = 5.779088,
  center_lat = 51.366951,
  center_lon = 5.767493
WHERE name = 'test21';
```

### Issue 4: RLS Policy Blocking Access
**Symptom**: Tileset not found error in edge function

**Check:**
```sql
-- Verify client has access to test21's golf club
SELECT 
  u.email,
  gcc.golf_club_id,
  gc.name as club_name,
  gct.name as tileset_name
FROM users u
JOIN client_golf_courses gcc ON u.id = gcc.client_id
JOIN golf_clubs gc ON gcc.golf_club_id = gc.id
LEFT JOIN golf_course_tilesets gct ON gc.id = gct.golf_club_id
WHERE u.email = 'YOUR_CLIENT_EMAIL'
  AND gct.name = 'test21';
```

## 🔍 Quick Diagnostic SQL

Run this to compare test20 and test21:

```sql
SELECT 
  name,
  golf_club_id,
  r2_folder_path,
  flight_date,
  flight_time,
  min_zoom,
  max_zoom,
  is_active,
  created_at
FROM golf_course_tilesets
WHERE name IN ('test20', 'test21')
ORDER BY name;
```

## 🎯 Most Likely Issue

Based on the symptoms, the most likely issue is:

**Tiles were uploaded to the wrong R2 path**

Check if tiles are at:
- ❌ `test21/tiles/` (wrong - legacy format)
- ✅ `test21/2025-11-24/17-30/tiles/` (correct - new format)

## 🛠️ Quick Fix

If tiles are in the wrong location in R2:

**Option 1: Move tiles in R2**
- Use Cloudflare R2 dashboard or API to move tiles
- Move from `test21/tiles/` to `test21/2025-11-24/17-30/tiles/`

**Option 2: Update database path**
```sql
-- If tiles are actually at test21/tiles/
UPDATE golf_course_tilesets 
SET r2_folder_path = 'test21/tiles'
WHERE name = 'test21';
```

**Option 3: Re-upload tiles**
- Use the TileUploader component
- Ensure date/time are set correctly
- Upload to: `test21/2025-11-24/17-30/tiles/`

## 📝 Verification Checklist

After fixing, verify:

- [ ] Browser console shows layer added successfully
- [ ] Network tab shows tile-proxy returning image data (not transparent PNG)
- [ ] Green orthomosaic tiles visible on map
- [ ] Edge function logs show successful tile fetches
- [ ] R2 storage has tiles at correct path
- [ ] Database r2_folder_path matches actual R2 path

## 🎉 Success Indicators

When working correctly, you should see:
- ✅ Green orthomosaic overlay on map
- ✅ Tile requests return ~50-200KB PNG files
- ✅ No 404 errors in edge function logs
- ✅ Console shows "Layer added successfully"
