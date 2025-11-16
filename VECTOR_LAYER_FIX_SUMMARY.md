# Vector Layer Upload Fix - Summary

## Problem Fixed ✅

**Error:** `Uncaught SyntaxError: The requested module 'https://deno.land/x/aws_sign_v4@1.0.2/mod.ts' does not provide an export named 'AwsV4Signer'`

**Root Cause:** The `aws_sign_v4` Deno module changed its exports and no longer provides `AwsV4Signer`.

## Solution Applied

### 1. Edge Function Fixed
**File:** `supabase/functions/upload-vector-layer/index.ts`

**Changes:**
```typescript
// OLD (Broken)
import { AwsV4Signer } from 'https://deno.land/x/aws_sign_v4@1.0.2/mod.ts'

// NEW (Working)
import { AwsClient } from 'https://deno.land/x/aws_api@v0.8.1/client/mod.ts'
```

**Usage:**
```typescript
// OLD
const signer = new AwsV4Signer({ ... })
const signedRequest = await signer.sign(uploadUrl, { ... })
const uploadResponse = await fetch(signedRequest)

// NEW
const awsClient = new AwsClient({ ... })
const uploadResponse = await awsClient.fetch(uploadUrl, { ... })
```

### 2. R2 Path Structure Updated

**OLD Path:**
```
vector-layers/{golf_club_id}/{layer_id}/data.geojson
```

**NEW Path:**
```
{course_name}/Vector_Layers/{layer_name}.geojson
```

**Example:**
```
test20/Vector_Layers/Fairways.geojson
test20/Vector_Layers/Greens.geojson
test20/Vector_Layers/Bunkers.geojson
```

This matches your raster tile structure:
```
test20/tiles/14/5242/12663.png
test20/Vector_Layers/Fairways.geojson
```

### 3. Upload Component Enhanced
**File:** `src/components/admin/VectorLayerUploader.tsx`

**New Features:**
- ✅ Course selector dropdown
- ✅ Fetches courses from `golf_course_tilesets`
- ✅ Extracts `course_name` from `r2_folder_path`
- ✅ Live R2 path preview
- ✅ Auto-selects if only one course exists

**UI Preview:**
```
┌─────────────────────────────────────┐
│ Golf Course: [Test Course 20    ▼] │
│ R2 Path: test20/Vector_Layers/     │
│          Fairways.geojson           │
├─────────────────────────────────────┤
│ Layer Name: [Fairways            ] │
│ Description: [Optional           ] │
├─────────────────────────────────────┤
│ [Upload Layer]                      │
└─────────────────────────────────────┘
```

### 4. Database Migration
**File:** `supabase/migrations/20241116000000_add_course_name_to_vector_layers.sql`

**Added:**
- `course_name` column to `vector_layers` table
- Index on `course_name` for fast lookups
- Composite index on `(golf_club_id, course_name)`

## How to Deploy

### 1. Run Migration
```bash
cd supabase
supabase db push
```

Or manually:
```bash
psql -h your-db-host -U postgres -d postgres \
  -f migrations/20241116000000_add_course_name_to_vector_layers.sql
```

### 2. Deploy Edge Function
```bash
supabase functions deploy upload-vector-layer
```

### 3. Test Upload
1. Go to admin panel
2. Select "Vector Layers"
3. Choose a golf course (e.g., "Test Course 20")
4. Upload a GeoJSON file
5. Verify R2 path: `test20/Vector_Layers/your_layer.geojson`

## Verification

### Check R2 Storage
```bash
# Using Cloudflare R2 CLI or dashboard
# Path should be: map-stats-tiles-prod/test20/Vector_Layers/
```

### Check Database
```sql
SELECT 
  id,
  golf_club_id,
  course_name,
  name,
  r2_key
FROM vector_layers
WHERE course_name = 'test20';
```

Expected result:
```
| id   | golf_club_id | course_name | name      | r2_key                              |
|------|--------------|-------------|-----------|-------------------------------------|
| ...  | ...          | test20      | Fairways  | test20/Vector_Layers/Fairways.geojson |
```

## What's Next: Swipe Feature

See `VECTOR_LAYER_SWIPE_GUIDE.md` for complete implementation guide.

**Quick Overview:**
1. Fetch vector layers by `course_name`
2. Load GeoJSON from R2
3. Use `mapbox-gl-compare` for swipe control
4. Left side: Raster tiles only
5. Right side: Raster tiles + Vector overlays
6. Share metadata (bounds, center, zoom) from `golf_course_tilesets`

**Install Dependencies:**
```bash
npm install mapbox-gl mapbox-gl-compare @turf/turf
```

**Basic Usage:**
```typescript
import MapboxCompare from 'mapbox-gl-compare'

const beforeMap = new mapboxgl.Map({ /* raster only */ })
const afterMap = new mapboxgl.Map({ /* raster + vector */ })

new MapboxCompare(beforeMap, afterMap, '#container')
```

## Files Changed

1. ✅ `supabase/functions/upload-vector-layer/index.ts` - Fixed import + R2 path
2. ✅ `src/components/admin/VectorLayerUploader.tsx` - Added course selector
3. ✅ `supabase/migrations/20241116000000_add_course_name_to_vector_layers.sql` - New migration
4. ✅ `VECTOR_LAYER_SWIPE_GUIDE.md` - Complete implementation guide
5. ✅ `VECTOR_LAYER_FIX_SUMMARY.md` - This file

## Testing Checklist

- [ ] Edge function deploys without errors
- [ ] Migration runs successfully
- [ ] Upload UI shows course dropdown
- [ ] Upload creates correct R2 path
- [ ] Database record has `course_name`
- [ ] Can fetch vector layers by `course_name`
- [ ] GeoJSON loads from R2 public URL

## Troubleshooting

### Edge function still fails
- Check Deno version compatibility
- Verify R2 credentials in Supabase secrets
- Check edge function logs: `supabase functions logs upload-vector-layer`

### Upload fails with "Missing course_name"
- Ensure migration ran successfully
- Check `golf_course_tilesets` has `r2_folder_path` set
- Verify course selector shows courses

### Vector layer not displaying
- Check R2 public URL is accessible
- Verify GeoJSON is valid (use geojson.io)
- Check browser console for CORS errors

## Support

For detailed swipe implementation, see:
- `VECTOR_LAYER_SWIPE_GUIDE.md` - Complete guide with code examples
- Mapbox GL JS docs: https://docs.mapbox.com/mapbox-gl-js/
- mapbox-gl-compare: https://github.com/mapbox/mapbox-gl-compare
