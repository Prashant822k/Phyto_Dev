# Automated Tile Upload Script

One-command upload for thousands of tiles.

## Quick Start

### 1. Install Dependencies
```bash
cd scripts
npm install
```

### 2. Configure R2 Credentials
```bash
cp .env.example .env
# Edit .env with your R2 credentials
```

### 3. Run Upload
```bash
node upload-tiles.js /path/to/your/tiles "Golf Club Name"
```

## Example

```bash
node upload-tiles.js C:/tiles/pine-valley "Pine Valley Golf Club"
```

**Output:**
```
🚀 Starting automated tile upload...

📂 Scanning C:/tiles/pine-valley...
   Found 4553 PNG files

📍 R2 destination: map-stats-tiles-prod/pine-valley-golf-club/tiles

⬆️  Uploading 4553 tiles in 46 batches...

  ✓ Batch 1/46: 100 succeeded, 0 failed
   Progress: 100/4553 (2%) - 3.2s elapsed
  ✓ Batch 2/46: 100 succeeded, 0 failed
   Progress: 200/4553 (4%) - 6.1s elapsed
  ...

✅ Upload complete!
   Total time: 142.3s
   Succeeded: 4553
   Failed: 0
```

## Features

- ✅ **Automatic batching** - Uploads 100 tiles at a time
- ✅ **Parallel uploads** - 20 concurrent uploads per batch
- ✅ **Progress tracking** - Real-time progress updates
- ✅ **Error handling** - Continues on failure, reports errors at end
- ✅ **Folder structure preserved** - Maintains z/x/y.png structure
- ✅ **Fast** - ~2-3 minutes for 4500 tiles

## After Upload

1. Create `metadata.json`:
```json
{
  "name": "Your Course Name",
  "bounds": [-111.930, 33.505, -111.905, 33.520],
  "center": [-111.9175, 33.5125, 17],
  "minzoom": 14,
  "maxzoom": 20
}
```

2. **Option A:** Use Admin UI
   - Go to Upload Tiles tab
   - Select golf course
   - Upload metadata.json only

3. **Option B:** Insert SQL directly:
```sql
INSERT INTO golf_course_tilesets (
  golf_club_id,
  name, description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path, tile_url_pattern
) VALUES (
  (SELECT id FROM golf_clubs WHERE name = 'Pine Valley Golf Club'),
  'Main Course', 'High-resolution aerial imagery',
  33.505, 33.520, -111.930, -111.905,
  33.5125, -111.9175,
  14, 20, 17,
  'pine-valley-golf-club/tiles', '{z}/{x}/{y}.png'
);
```

## Troubleshooting

**Authentication error:**
- Check R2 credentials in `.env`
- Verify account ID is correct

**Tiles not found:**
- Ensure folder contains z/x/y.png structure
- Check path is absolute or relative to scripts folder

**Slow uploads:**
- Increase `PARALLEL_UPLOADS` in script (line 15)
- Check your internet connection

**Failed uploads:**
- Script reports failed files at end
- Re-run script - it will skip existing files

## Configuration

Edit `upload-tiles.js` to customize:

```javascript
const BATCH_SIZE = 100;        // Files per batch (increase for faster upload)
const PARALLEL_UPLOADS = 20;   // Concurrent uploads (increase if you have fast internet)
```

## Speed Comparison

| Method | 4553 tiles | Notes |
|--------|-----------|-------|
| Browser | 30+ min | May timeout |
| AWS CLI | 5-10 min | Single-threaded |
| This script | 2-3 min | Parallel uploads |
| Rclone | 1-2 min | Fastest, but manual |

