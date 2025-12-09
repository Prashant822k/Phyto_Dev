# CORS Error Fix - Quick Summary

## Error You Encountered

```
Access to fetch at 'https://efnorpyrsfoxooufujnd.supabase.co/functions/v1/upload-vector-layer' 
from origin 'http://localhost:5000' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

## Root Cause

The edge function's CORS headers were **incomplete**. Missing `Access-Control-Allow-Methods` header.

## What Was Fixed

### Before (Broken)
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### After (Fixed) ✅
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',  // ← ADDED
  'Access-Control-Max-Age': '86400',                // ← ADDED
}
```

## Additional Fix: Auto-Create Vector_Layers Directory

Added code to automatically create the `Vector_Layers` directory in R2:

```typescript
// Ensure Vector_Layers directory exists by creating a .keep file if needed
const vectorLayersDir = `${courseName}/Vector_Layers/`
const keepFilePath = `${vectorLayersDir}.keep`

try {
  const keepFileUrl = `${r2Endpoint}/${r2BucketName}/${keepFilePath}`
  await awsClient.fetch(keepFileUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: new TextEncoder().encode('This file ensures the Vector_Layers directory exists'),
  }).catch(() => {
    console.log('Vector_Layers directory may already exist')
  })
} catch (error) {
  console.log('Could not create .keep file, continuing with upload:', error)
}
```

**What this does:**
1. First vector layer upload for a course (e.g., `test20`)
2. Creates `test20/Vector_Layers/.keep` file
3. This establishes the directory in R2
4. Your vector layer is then uploaded to `test20/Vector_Layers/LayerName.geojson`
5. Subsequent uploads skip this step (directory already exists)

## Deploy the Fix

```bash
# Deploy the updated edge function
supabase functions deploy upload-vector-layer

# Verify deployment
supabase functions logs upload-vector-layer --follow
```

## Test the Fix

1. **Open your app** at `http://localhost:5000`
2. **Go to Vector Layers** upload page
3. **Select a golf course** (e.g., "Test Course 20")
4. **Upload a GeoJSON file**
5. **Check console** - should see success, not CORS error

## Expected Behavior After Fix

### ✅ CORS Preflight
```
OPTIONS /functions/v1/upload-vector-layer
← 200 OK
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: POST, OPTIONS
  Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

### ✅ Actual Upload
```
POST /functions/v1/upload-vector-layer
← 200 OK
  {
    "success": true,
    "data": {
      "id": "...",
      "name": "Fairways",
      "r2_key": "test20/Vector_Layers/Fairways.geojson"
    }
  }
```

### ✅ R2 Structure Created
```
map-stats-tiles-prod/
└── test20/
    ├── 2024-11-05/
    │   └── 14-30/
    │       └── tiles/
    └── Vector_Layers/          ← Auto-created
        ├── .keep               ← Auto-created
        └── Fairways.geojson    ← Your upload
```

## Understanding Your R2 Structure

Your current structure (which is **correct**):

```
test20/
├── 2024-11-05/14-30/tiles/    ← Raster tiles from Nov 5 flight
├── 2024-11-10/09-15/tiles/    ← Raster tiles from Nov 10 flight
└── Vector_Layers/             ← Vector layers (shared across all dates)
    ├── Fairways.geojson
    └── Greens.geojson
```

**Why this works:**
- **Raster tiles** change with each flight → organized by date/time
- **Vector layers** are static course boundaries → one folder for all dates
- Both sit at the same level under the course name
- Vector layers overlay on any date's raster tiles

See `R2_STRUCTURE_EXPLAINED.md` for detailed explanation.

## Troubleshooting

### Still getting CORS error?
1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+F5)
3. **Check function deployed:** `supabase functions list`
4. **Check logs:** `supabase functions logs upload-vector-layer`

### Vector_Layers directory not created?
1. **Check R2 credentials** are set in Supabase secrets
2. **Check bucket name** is correct: `map-stats-tiles-prod`
3. **Check logs** for R2 upload errors

### Upload succeeds but file not in R2?
1. **Verify R2 public URL** is set
2. **Check Cloudflare R2 dashboard** manually
3. **Test R2 access** with a simple GET request

## Files Modified

1. ✅ `supabase/functions/upload-vector-layer/index.ts`
   - Added `Access-Control-Allow-Methods` header
   - Added `Access-Control-Max-Age` header
   - Added auto-creation of `Vector_Layers` directory

## Next Steps After Fix Works

1. ✅ Upload test vector layers
2. ✅ Verify R2 structure is correct
3. ✅ Implement swipe feature (see `VECTOR_LAYER_SWIPE_GUIDE.md`)
4. ✅ Test vector layers display on map

## Quick Deploy Command

```bash
# One command to deploy everything
supabase functions deploy upload-vector-layer && \
supabase functions logs upload-vector-layer --follow
```

Then test upload from your UI! 🚀
