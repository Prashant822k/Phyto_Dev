# Tile Loading Issue - Diagnosis and Fix

## Problem
Mapbox is getting 400 Bad Request errors when trying to fetch tiles from your R2 bucket.

## Root Cause
**Path Mismatch**: Your database `r2_folder_path` doesn't match your actual R2 bucket structure.

### Current State
- **Database `r2_folder_path`**: `test20/2025-11-05/09-30/tiles`
- **Actual R2 bucket path**: `map-stats-tiles-prod/test20/2025-11-05/09-30/tiles/`
- **Missing prefix**: `map-stats-tiles-prod/`

### How It Works
1. Mapbox requests a tile: `/tile-proxy?tilesetId=xxx&z=15&x=16910&y=10916`
2. `tile-proxy` looks up tileset metadata and constructs key: `test20/2025-11-05/09-30/tiles/15/16910/10916.png`
3. `tile-proxy` calls `r2-sign` with action `getTile` and the key
4. `r2-sign` extracts `r2_folder_path` from key: `test20/2025-11-05/09-30/tiles`
5. `r2-sign` queries database for tileset with that `r2_folder_path`
6. **FAILS**: No tileset found because database has `test20/2025-11-05/09-30/tiles` but should have `map-stats-tiles-prod/test20/2025-11-05/09-30/tiles`
7. Returns 404/400 error

## Solution

### Option 1: Update Database (Recommended if tiles are already uploaded)
Run the SQL in `UPDATE_TILESET_PATH.sql`:

```sql
UPDATE golf_course_tilesets 
SET r2_folder_path = 'map-stats-tiles-prod/test20/2025-11-05/09-30/tiles'
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';
```

### Option 2: Re-upload Tiles Without Bucket Prefix
If you want cleaner paths, re-upload your tiles to R2 without the `map-stats-tiles-prod/` prefix:
- Upload to: `test20/2025-11-05/09-30/tiles/z/x/y.png`
- Keep database as: `test20/2025-11-05/09-30/tiles`

## Verification Steps

### 1. Check Database
```sql
SELECT id, name, r2_folder_path, tile_url_pattern, flight_date, flight_time 
FROM golf_course_tilesets 
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';
```

### 2. Check R2 Bucket
Verify your tiles exist at the correct path in your R2 bucket.

### 3. Test in Browser
1. Open your app
2. Open browser DevTools (F12)
3. Go to Console tab
4. Load the map
5. Look for logs:
   - `tile-proxy - Fetching tile: ...` - shows the constructed key
   - `getTile - key: ...` - shows what r2-sign received
   - `getTile - r2FolderPath: ...` - shows extracted folder path
   - `getTile - tileset: ...` - shows if tileset was found

### 4. Check Network Tab
1. Open Network tab in DevTools
2. Filter by "tile-proxy"
3. Click on a failed request
4. Check Response tab for error details

## Additional Notes

### Date Inconsistency
Your metadata shows:
- `flight_date`: 2024-11-05 (year 2024)
- `r2_folder_path`: test20/**2025**-11-05/09-30/tiles (year 2025)

Make sure these are consistent. The path should match the flight_date.

### Bucket Structure Best Practices
For cleaner organization, consider this structure:
- **Without bucket prefix**: `{courseId}/{YYYY-MM-DD}/{HH-MM}/tiles/z/x/y.png`
- Example: `test20/2024-11-05/14-30/tiles/15/16910/10916.png`

The bucket name (`map-stats-tiles-prod`) is already part of the R2 configuration and shouldn't be in the path.

## Testing After Fix

After updating the database, refresh your browser and check:
1. ✅ No 400 errors in Console
2. ✅ Tiles load successfully
3. ✅ Map displays your orthomosaic imagery

## Logs to Monitor

Watch for these console logs:
```
tile-proxy - Fetching tile: map-stats-tiles-prod/test20/2025-11-05/09-30/tiles/15/16910/10916.png
getTile - key: map-stats-tiles-prod/test20/2025-11-05/09-30/tiles/15/16910/10916.png
getTile - r2FolderPath: map-stats-tiles-prod/test20/2025-11-05/09-30/tiles
getTile - tileset: { golf_club_id: '...' }
getTile - Successfully fetched tile, size: XXXXX bytes
```

If you see "Tileset not found", the database path still doesn't match.
