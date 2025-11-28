# test21 Tiles Not Loading - Troubleshooting

## 🔴 Problem
- **test20**: Green orthomosaic tiles load correctly ✅
- **test21**: Only satellite imagery visible, no orthomosaic tiles ❌
- Both tilesets have correct metadata in database
- Both have tiles in R2 storage

## 📊 What We Know

### test20 (Working)
```
Golf Club ID: 4fe11be9-b17b-4070-b790-19bd0c0f2b9b
R2 Path: test20/2025-11-05/09-30/tiles
Flight Date: 2025-11-05
Flight Time: 09:30:00
```

### test21 (Not Working)
```
Golf Club ID: 8028430f-500a-4144-980a-bb82089f3b74
R2 Path: test21/2025-11-24/17-30/tiles
Flight Date: 2025-11-24
Flight Time: 17:30:00
```

## 🔍 Diagnostic Steps

### Step 1: Run Diagnostic SQL

Open Supabase SQL Editor and run:
```bash
# File location:
diagnose-test21.sql
```

This will check:
- Tileset metadata comparison
- Client access permissions
- RLS policies
- Golf club associations
- Tile path construction

### Step 2: Check Browser Console

1. Open test21 course page
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for these logs:

**Expected logs:**
```
🗺️ Updating layers...
  Selected layers: ["89713b44-..."]
  ✅ Adding layer: test21 (2025-11-24)
     R2 Path: test21/2025-11-24/17-30/tiles
     Tile URL: https://...tile-proxy?tilesetId=...&z=15&x=16774&y=10893
     ✅ Layer added successfully
```

**If you see errors:**
```
❌ Tileset not found for ID: ...
❌ Error adding layer: ...
```

### Step 3: Check Network Tab

1. Open Network tab in DevTools
2. Filter by "tile-proxy"
3. Click on a tile request
4. Check Response:
   - ✅ **Image data** (50-200KB) = Working
   - ❌ **Tiny response** (~100 bytes) = Transparent PNG fallback = Not working

### Step 4: Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to: Edge Functions → tile-proxy → Logs
3. Look for test21 tile requests
4. Check for errors:

**If working:**
```
tile-proxy - Fetching tile: test21/2025-11-24/17-30/tiles/15/16774/10893.png
[200 OK]
```

**If not working:**
```
tile-proxy - Tile fetch failed: 404 Not Found
tile-proxy - Request key: test21/2025-11-24/17-30/tiles/15/16774/10893.png
```

## 🐛 Most Likely Causes

### Cause 1: Tiles Uploaded to Wrong Path ⭐ MOST LIKELY

**Problem:** Tiles are in R2 but at a different path than database expects

**Check:**
- Database says: `test21/2025-11-24/17-30/tiles/`
- But tiles are actually at: `test21/tiles/` or `test21/2024-11-24/17-30/tiles/`

**Fix:**
```sql
-- Option A: Update database to match actual R2 path
UPDATE golf_course_tilesets 
SET r2_folder_path = 'test21/tiles'  -- Change to actual path in R2
WHERE name = 'test21';

-- Option B: Move tiles in R2 to match database
-- Use Cloudflare R2 dashboard to move tiles
```

### Cause 2: Wrong Golf Club Assignment

**Problem:** test21 tileset is linked to wrong golf club

**Check:**
```sql
-- Verify golf club IDs match
SELECT 
  gct.name as tileset,
  gct.golf_club_id,
  gc.name as club_name
FROM golf_course_tilesets gct
JOIN golf_clubs gc ON gct.golf_club_id = gc.id
WHERE gct.name IN ('test20', 'test21');
```

**Fix:**
```sql
-- If test21 is linked to wrong club, update it
UPDATE golf_course_tilesets 
SET golf_club_id = '8028430f-500a-4144-980a-bb82089f3b74'
WHERE name = 'test21';
```

### Cause 3: Client Not Assigned to test21's Golf Club

**Problem:** Client has access to test20's club but not test21's club

**Check:**
```sql
-- Check client's course assignments
SELECT 
  u.email,
  gc.name as club_name,
  gct.name as tileset_name
FROM users u
JOIN client_golf_courses gcc ON u.id = gcc.client_id
JOIN golf_clubs gc ON gcc.golf_club_id = gc.id
LEFT JOIN golf_course_tilesets gct ON gc.id = gct.golf_club_id
WHERE u.email = 'YOUR_CLIENT_EMAIL';
```

**Fix:** Assign client to test21's golf club via admin dashboard

### Cause 4: Incorrect Bounds/Coordinates

**Problem:** Bounds in database don't match tile coverage

**Check:**
```sql
-- Compare bounds
SELECT 
  name,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon
FROM golf_course_tilesets
WHERE name IN ('test20', 'test21');
```

**Fix:**
```sql
-- Copy bounds from test20 to test21
UPDATE golf_course_tilesets t21
SET 
  min_lat = t20.min_lat,
  max_lat = t20.max_lat,
  min_lon = t20.min_lon,
  max_lon = t20.max_lon,
  center_lat = t20.center_lat,
  center_lon = t20.center_lon
FROM golf_course_tilesets t20
WHERE t21.name = 'test21'
  AND t20.name = 'test20';
```

### Cause 5: Tileset Inactive

**Problem:** is_active flag is false

**Check:**
```sql
SELECT name, is_active 
FROM golf_course_tilesets 
WHERE name = 'test21';
```

**Fix:**
```sql
UPDATE golf_course_tilesets 
SET is_active = true
WHERE name = 'test21';
```

## 🛠️ Quick Fix Workflow

### If tiles are in wrong R2 location:

**Step 1:** Find actual tile location in R2
- Go to Cloudflare R2 Dashboard
- Browse your bucket
- Look for `test21/` folder
- Check where tiles actually are

**Step 2:** Update database to match
```sql
-- If tiles are at test21/tiles/
UPDATE golf_course_tilesets 
SET r2_folder_path = 'test21/tiles'
WHERE name = 'test21';

-- If tiles are at test21/2024-11-24/17-30/tiles/ (wrong date)
UPDATE golf_course_tilesets 
SET r2_folder_path = 'test21/2024-11-24/17-30/tiles'
WHERE name = 'test21';
```

**Step 3:** Refresh browser and test

### If tiles need to be re-uploaded:

**Step 1:** Delete old tileset metadata
```sql
DELETE FROM golf_course_tilesets 
WHERE name = 'test21';
```

**Step 2:** Re-upload via admin dashboard
- Go to Upload Tiles tab
- Select test21 golf club
- Set date: 2025-11-24
- Set time: 17:30
- Upload tiles
- Upload metadata

## 📝 Verification Checklist

After applying fix:

- [ ] Run diagnostic SQL - no errors
- [ ] Browser console shows "Layer added successfully"
- [ ] Network tab shows tile-proxy returning image data
- [ ] Green orthomosaic visible on map
- [ ] Edge function logs show 200 OK responses
- [ ] No 404 errors in logs

## 🎯 Expected Tile Path

For test21 at zoom 15, x=16774, y=10893:

**Full R2 path:**
```
test21/2025-11-24/17-30/tiles/15/16774/10893.png
```

**Breakdown:**
- `test21/` - Course name
- `2025-11-24/` - Flight date
- `17-30/` - Flight time (17:30)
- `tiles/` - Tiles folder
- `15/16774/10893.png` - Tile coordinates

## 🔧 Test a Single Tile

To test if a specific tile exists:

1. Get your auth token from browser console:
```javascript
const session = await supabase.auth.getSession()
console.log(session.data.session.access_token)
```

2. Test tile URL in browser:
```
https://YOUR_SUPABASE_URL/functions/v1/tile-proxy?tilesetId=89713b44-b261-48c8-bd72-2542a1339239&z=15&x=16774&y=10893&token=YOUR_TOKEN
```

3. Check response:
   - ✅ PNG image loads = Working
   - ❌ Tiny transparent PNG = Not working

## 📞 Need Help?

If none of these fixes work:

1. Run `diagnose-test21.sql` and share output
2. Check edge function logs and share errors
3. Check browser console and share errors
4. Verify tiles exist in R2 at the expected path
5. Share screenshot of R2 folder structure

## 🎉 Success!

When working, you should see:
- ✅ Green orthomosaic tiles overlay
- ✅ Smooth tile loading
- ✅ No console errors
- ✅ Tile requests return ~50-200KB
- ✅ Edge function logs show 200 OK
