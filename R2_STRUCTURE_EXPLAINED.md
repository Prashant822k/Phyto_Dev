# R2 Storage Structure - Complete Hierarchy

## Your Current R2 Structure

```
map-stats-tiles-prod/
└── test20/                           ← Golf Course Name
    ├── 2024-11-05/                   ← Flight Date (Raster Tiles)
    │   └── 14-30/                    ← Flight Time
    │       └── tiles/
    │           ├── 14/
    │           ├── 15/
    │           └── 16/
    ├── 2024-11-10/                   ← Another Flight Date
    │   └── 09-15/
    │       └── tiles/
    │           └── ...
    └── Vector_Layers/                ← Vector Layers (Parallel to dates)
        ├── .keep                     ← Auto-created to ensure directory exists
        ├── Fairways.geojson
        ├── Greens.geojson
        ├── Bunkers.geojson
        └── Water_Hazards.geojson
```

## Key Points

### 1. Parallel Hierarchy ✅
- **Date folders** (e.g., `2024-11-05/14-30/tiles/`) contain **raster tiles** from different flights
- **`Vector_Layers/`** folder sits at the **same level** as date folders
- This is **correct and intentional** - vector layers don't change with each flight

### 2. Why This Structure Works

**Raster Tiles (Time-based):**
```
test20/2024-11-05/14-30/tiles/15/5242/12663.png  ← Flight on Nov 5
test20/2024-11-10/09-15/tiles/15/5242/12663.png  ← Flight on Nov 10
```
- Different flights = different imagery
- User selects date/time to view specific flight

**Vector Layers (Static):**
```
test20/Vector_Layers/Fairways.geojson
test20/Vector_Layers/Greens.geojson
```
- Course boundaries don't change between flights
- Same vector layers overlay on any date's raster tiles

### 3. Auto-Creation of Vector_Layers Directory

The edge function now automatically creates the `Vector_Layers` directory:

```typescript
// Creates: test20/Vector_Layers/.keep
const vectorLayersDir = `${courseName}/Vector_Layers/`
const keepFilePath = `${vectorLayersDir}.keep`

await awsClient.fetch(keepFileUrl, {
  method: 'PUT',
  body: new TextEncoder().encode('This file ensures the Vector_Layers directory exists')
})
```

**What happens:**
1. First vector layer upload for a course
2. Function checks if `test20/Vector_Layers/` exists
3. Creates `.keep` file to establish the directory
4. Uploads your vector layer file
5. Subsequent uploads skip `.keep` creation (already exists)

## Database Mapping

### `golf_course_tilesets` Table
Stores **raster tiles** with date/time:

```sql
SELECT 
  name,
  r2_folder_path,
  flight_date,
  flight_time
FROM golf_course_tilesets
WHERE golf_club_id = 'test-club-id';
```

**Result:**
```
| name              | r2_folder_path              | flight_date | flight_time |
|-------------------|-----------------------------|-------------|-------------|
| Test20 Nov 5      | test20/2024-11-05/14-30/tiles | 2024-11-05  | 14:30:00    |
| Test20 Nov 10     | test20/2024-11-10/09-15/tiles | 2024-11-10  | 09:15:00    |
```

### `vector_layers` Table
Stores **vector layers** (no date/time):

```sql
SELECT 
  name,
  course_name,
  r2_key
FROM vector_layers
WHERE golf_club_id = 'test-club-id';
```

**Result:**
```
| name          | course_name | r2_key                              |
|---------------|-------------|-------------------------------------|
| Fairways      | test20      | test20/Vector_Layers/Fairways.geojson |
| Greens        | test20      | test20/Vector_Layers/Greens.geojson   |
```

## Usage in Map Component

### Loading Raster Tiles (Date-specific)
```typescript
// User selects a specific flight date/time
const selectedTileset = tilesets.find(t => 
  t.flight_date === '2024-11-05' && 
  t.flight_time === '14:30:00'
)

// Load raster tiles for that date
const tileUrl = `${R2_PUBLIC_URL}/${selectedTileset.r2_folder_path}/{z}/{x}/{y}.png`
// Result: https://pub-xxx.r2.dev/test20/2024-11-05/14-30/tiles/15/5242/12663.png
```

### Loading Vector Layers (Course-wide)
```typescript
// Fetch all vector layers for the course (no date filter)
const vectorLayers = await supabase
  .from('vector_layers')
  .select('*')
  .eq('course_name', 'test20')
  .eq('is_active', true)

// Load each vector layer
for (const layer of vectorLayers) {
  const geojson = await fetch(`${R2_PUBLIC_URL}/${layer.r2_key}`)
  // Result: https://pub-xxx.r2.dev/test20/Vector_Layers/Fairways.geojson
}
```

### Combining Both in Swipe View
```typescript
// Left side: Raster from Nov 5
const leftTileUrl = 'test20/2024-11-05/14-30/tiles/{z}/{x}/{y}.png'

// Right side: Raster from Nov 5 + Vector layers
const rightTileUrl = 'test20/2024-11-05/14-30/tiles/{z}/{x}/{y}.png'
const vectorLayers = ['test20/Vector_Layers/Fairways.geojson', ...]

// User can swipe to compare raster-only vs raster+vector
```

## Upload Workflows

### Uploading Raster Tiles (Admin)
```
1. Select Golf Course: "Test Course 20"
2. Select/Enter Flight Date: 2024-11-10
3. Select/Enter Flight Time: 09:15
4. Upload Tiles (ZIP or folder)
   ↓
R2 Path: test20/2024-11-10/09-15/tiles/14/...
DB Record: golf_course_tilesets with flight_date and flight_time
```

### Uploading Vector Layers (Admin)
```
1. Select Golf Course: "Test Course 20"
2. Upload GeoJSON file
3. Enter Layer Name: "Bunkers"
   ↓
R2 Path: test20/Vector_Layers/Bunkers.geojson
DB Record: vector_layers with course_name = "test20"
Auto-creates: test20/Vector_Layers/.keep (if first upload)
```

## Benefits of This Structure

### ✅ Separation of Concerns
- Raster tiles organized by date/time (temporal data)
- Vector layers at course level (static data)

### ✅ Easy Date Selection
```typescript
// Get all available dates for a course
const dates = await supabase
  .from('golf_course_tilesets')
  .select('flight_date, flight_time')
  .eq('r2_folder_path', 'test20/%', { operator: 'like' })
  .order('flight_date', { ascending: false })

// User picks a date from dropdown
```

### ✅ Shared Vector Layers
- Upload vector layers once
- Use across all date views
- No duplication

### ✅ Storage Efficiency
```
❌ BAD (Duplicated vectors):
test20/2024-11-05/14-30/tiles/...
test20/2024-11-05/14-30/vectors/Fairways.geojson
test20/2024-11-10/09-15/tiles/...
test20/2024-11-10/09-15/vectors/Fairways.geojson  ← Duplicate!

✅ GOOD (Shared vectors):
test20/2024-11-05/14-30/tiles/...
test20/2024-11-10/09-15/tiles/...
test20/Vector_Layers/Fairways.geojson  ← Single copy
```

## Cloudflare R2 Dashboard View

When you open your R2 bucket, you'll see:

```
📁 map-stats-tiles-prod
  📁 test20
    📁 2024-11-05
      📁 14-30
        📁 tiles
          📁 14
          📁 15
          📁 16
    📁 2024-11-10
      📁 09-15
        📁 tiles
          📁 14
          📁 15
    📁 Vector_Layers
      📄 .keep
      📄 Fairways.geojson
      📄 Greens.geojson
      📄 Bunkers.geojson
```

## Troubleshooting

### Vector_Layers directory not appearing
**Cause:** First upload hasn't happened yet

**Solution:** Upload any vector layer - directory will be auto-created

### .keep file purpose
**Purpose:** R2 (like S3) doesn't have "empty directories" - the `.keep` file ensures the directory exists

**Can I delete it?** Yes, once you have actual vector layer files, but it's harmless to keep

### Vector layers not loading
**Check:**
1. R2 public URL is correct
2. CORS is enabled on R2 bucket
3. File path matches: `test20/Vector_Layers/LayerName.geojson`

## Summary

Your structure is **perfect** for this use case:
- ✅ Date-based raster tiles for temporal imagery
- ✅ Course-level vector layers for static boundaries
- ✅ Parallel hierarchy keeps them organized
- ✅ Auto-creation ensures Vector_Layers exists
- ✅ No duplication, efficient storage

The CORS fix and auto-directory creation will make uploads work smoothly! 🎉
