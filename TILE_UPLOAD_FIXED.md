# ✅ Tile Upload Fixed - Frontend to R2 with Date/Time Structure

## What Was Fixed

### 1. **MapboxGolfCourseMap Error** ✅
- Fixed the `tileset is not defined` error
- Replaced old file with updated multi-layer version
- Component now properly supports multiple tilesets

### 2. **R2 Upload with Date/Time Structure** ✅
- Updated `r2-sign` edge function to support batch tile uploads
- Added `getBatchPutUrls` action for generating presigned URLs
- Supports both new and legacy R2 path structures

### 3. **Frontend Tile Uploader** ✅
- Updated `TileUploader` class to accept date/time parameters
- Modified to use Supabase edge function instead of Cloudflare Worker
- Added date/time inputs to `TileUploadComponent`

---

## How It Works Now

### R2 Path Structure

**With Date/Time (New):**
```
{courseId}/{YYYY-MM-DD}/{HH-MM}/tiles/{z}/{x}/{y}.png

Example:
the-best-golf/2024-11-03/14-30/tiles/15/5242/12663.png
```

**Without Date/Time (Legacy):**
```
{courseId}/tiles/{z}/{x}/{y}.png

Example:
the-best-golf/tiles/15/5242/12663.png
```

---

## Upload Flow

### Frontend → Edge Function → R2

1. **User uploads tiles** via TileUploadComponent
2. **Provides:**
   - Course ID (required)
   - Flight Date (optional)
   - Flight Time (optional)
3. **Frontend calls** `r2-sign` edge function with `getBatchPutUrls` action
4. **Edge function generates** presigned PUT URLs for each tile
5. **Frontend uploads** tiles directly to R2 using presigned URLs
6. **Tiles stored** in correct date/time-based structure

---

## Changes Made

### 1. Edge Function: `r2-sign`

**File:** `supabase/functions/r2-sign/index.ts`

**Added:**
- `getBatchPutUrls` action type
- `tiles`, `courseId`, `flightDate`, `flightTime` parameters
- Path construction logic:
  ```typescript
  if (flightDate && flightTime) {
    basePath = `${courseId}/${flightDate}/${flightTime.replace(':', '-')}/tiles`;
  } else {
    basePath = `${courseId}/tiles`;
  }
  ```

**Returns:**
```json
{
  "urls": [
    { "z": 15, "x": 5242, "y": 12663, "url": "https://...", "key": "..." }
  ],
  "basePath": "the-best-golf/2024-11-03/14-30/tiles"
}
```

### 2. TileUploader Class

**File:** `src/lib/tile-upload.ts`

**Changes:**
- Added `flightDate` and `flightTime` to constructor
- Switched from Cloudflare Worker to Supabase edge function
- Passes date/time to edge function
- Requires authentication (Supabase session)

**Usage:**
```typescript
const uploader = new TileUploader(
  'the-best-golf',  // courseId
  '2024-11-03',     // flightDate (optional)
  '14:30'           // flightTime (optional)
);
await uploader.uploadTiles(tiles, onProgress);
```

### 3. TileUploadComponent

**File:** `src/components/TileUploadComponent.tsx`

**Added:**
- Date input field
- Time input field
- Visual preview of R2 path structure
- Info box showing where tiles will be uploaded

**UI:**
```
┌─────────────────────────────────────┐
│ Course ID: [the-best-golf      ]   │
│                                     │
│ Flight Date: [2024-11-03]           │
│ Flight Time: [14:30        ]        │
│                                     │
│ ℹ️ Tiles will be uploaded to:       │
│ the-best-golf/2024-11-03/14-30/    │
│ tiles/z/x/y.png                     │
│                                     │
│ [Select ZIP]  [Select Folder]       │
└─────────────────────────────────────┘
```

---

## Testing the Upload

### Step 1: Prepare Tiles

You need tiles in this structure:
```
tiles/
  15/
    5242/
      12663.png
      12664.png
    5243/
      12663.png
```

Or create a ZIP file with this structure.

### Step 2: Upload via Frontend

1. **Go to:** `/tile-upload` page
2. **Enter Course ID:** `the-best-golf`
3. **Enter Flight Date:** `2024-11-03`
4. **Enter Flight Time:** `14:30`
5. **Click "Select ZIP"** or **"Select Folder"**
6. **Wait for upload** to complete

### Step 3: Verify in R2

Check your R2 bucket:
```
the-best-golf/
  2024-11-03/
    14-30/
      tiles/
        15/
          5242/
            12663.png ✅
            12664.png ✅
```

### Step 4: Create Tileset Record

Use `TilesetMetadataUploader` to create the database record:
- **Course ID:** `the-best-golf`
- **Flight Date:** `2024-11-03`
- **Flight Time:** `14:30`
- **Upload metadata.json**

The `r2_folder_path` will be automatically set to:
```
the-best-golf/2024-11-03/14-30/tiles
```

---

## Complete Workflow

### 1. Upload Tiles
```bash
# Via frontend at /tile-upload
Course ID: the-best-golf
Flight Date: 2024-11-03
Flight Time: 14:30
Upload: tiles.zip
```

### 2. Create Tileset Metadata
```bash
# Via frontend at /admin (TilesetMetadataUploader)
Golf Course: Select from dropdown
Flight Date: 2024-11-03
Flight Time: 14:30
Upload: metadata.json
```

### 3. View on Map
```bash
# Via frontend at /test-layers
Select Golf Course: The Best Golf
Click "Layers" button
See tileset: "Nov 3, 2024 14:30"
```

---

## Backward Compatibility

### Legacy Uploads (No Date/Time)

If you don't provide date/time:
```typescript
const uploader = new TileUploader('the-best-golf');
```

Tiles upload to:
```
the-best-golf/tiles/15/5242/12663.png
```

This maintains compatibility with existing tilesets.

---

## Authentication

**Required:** User must be logged in as admin

The edge function checks:
```typescript
requireAdmin(); // Only admins can upload tiles
```

Make sure you're logged in before uploading.

---

## Error Handling

### Common Errors

**"Authentication required"**
- Solution: Log in to the app first

**"Upload URL generation failed: 403"**
- Solution: Make sure you're logged in as admin

**"Missing tiles or courseId"**
- Solution: Provide course ID and tiles

**"No tiles found in ZIP"**
- Solution: Check ZIP structure (should be `z/x/y.png`)

---

## Next Steps

### 1. Test Upload ✅
```bash
npm run dev
# Visit /tile-upload
# Upload tiles with date/time
```

### 2. Verify R2 Structure ✅
```bash
# Check R2 bucket
# Should see: courseId/YYYY-MM-DD/HH-MM/tiles/
```

### 3. Create Tileset Record ✅
```bash
# Use TilesetMetadataUploader
# Match date/time from upload
```

### 4. Test Layer Selection ✅
```bash
# Visit /test-layers
# See tileset with date/time
# Enable 2 layers, test swipe
```

---

## Summary

✅ **MapboxGolfCourseMap fixed** - No more errors  
✅ **Edge function updated** - Supports date/time paths  
✅ **Frontend uploader updated** - Uses edge function  
✅ **UI enhanced** - Date/time inputs added  
✅ **Backward compatible** - Legacy uploads still work  
✅ **Ready to use** - Upload tiles from frontend!

---

## Files Modified

1. `supabase/functions/r2-sign/index.ts` - Added `getBatchPutUrls`
2. `src/lib/tile-upload.ts` - Updated to use edge function
3. `src/components/TileUploadComponent.tsx` - Added date/time inputs
4. `src/components/MapboxGolfCourseMap.tsx` - Fixed errors

---

**Ready to upload tiles!** 🚀

Visit `/tile-upload` and try it out!
