# Vector Layer Upload - Deployment Checklist

## Quick Start

Run these commands to deploy all fixes:

```bash
# 1. Deploy database migration
cd supabase
supabase db push

# 2. Deploy edge function
supabase functions deploy upload-vector-layer

# 3. Verify deployment
supabase functions logs upload-vector-layer --follow
```

## Step-by-Step Deployment

### Step 1: Database Migration ✅

**Add `course_name` column to `vector_layers` table**

```bash
# Option A: Using Supabase CLI (Recommended)
cd supabase
supabase db push

# Option B: Manual SQL
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -f migrations/20241116000000_add_course_name_to_vector_layers.sql
```

**Verify:**
```sql
-- Check column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vector_layers' AND column_name = 'course_name';

-- Should return:
-- column_name | data_type
-- course_name | text
```

### Step 2: Deploy Edge Function ✅

**Deploy the fixed `upload-vector-layer` function**

```bash
# Deploy function
supabase functions deploy upload-vector-layer

# Watch logs (in separate terminal)
supabase functions logs upload-vector-layer --follow
```

**Verify:**
```bash
# Test function is accessible
curl -i https://your-project.supabase.co/functions/v1/upload-vector-layer \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Should return 401 (auth required) not 500 (boot error)
```

### Step 3: Test Upload Flow ✅

**1. Login as Admin**
- Go to your app
- Login with admin credentials
- Navigate to Vector Layers page

**2. Upload Test Layer**
- Select a golf course (e.g., "Test Course 20")
- Upload a GeoJSON file
- Enter layer name (e.g., "Test Fairways")
- Click "Upload Layer"

**3. Verify R2 Storage**
Check Cloudflare R2 dashboard or use CLI:
```bash
# Path should be: map-stats-tiles-prod/test20/Vector_Layers/Test_Fairways.geojson
```

**4. Verify Database**
```sql
SELECT 
  id,
  golf_club_id,
  course_name,
  name,
  r2_key,
  created_at
FROM vector_layers
ORDER BY created_at DESC
LIMIT 5;
```

Expected output:
```
| course_name | name          | r2_key                                      |
|-------------|---------------|---------------------------------------------|
| test20      | Test Fairways | test20/Vector_Layers/Test_Fairways.geojson |
```

## Environment Variables

Ensure these are set in Supabase:

```bash
# Check current secrets
supabase secrets list

# Required secrets for R2 upload:
CLOUDFLARE_R2_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET_NAME=map-stats-tiles-prod
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

Set missing secrets:
```bash
supabase secrets set CLOUDFLARE_R2_ACCOUNT_ID=your_value
supabase secrets set R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## Troubleshooting

### Issue: "worker boot error: AwsV4Signer"
**Status:** ✅ FIXED

**Solution:** Already fixed in `upload-vector-layer/index.ts`
- Changed from `aws_sign_v4` to `aws_api@v0.8.1`
- Redeploy function: `supabase functions deploy upload-vector-layer`

### Issue: "Missing required fields: course_name"
**Cause:** Migration not run or frontend not sending `course_name`

**Solution:**
1. Run migration: `supabase db push`
2. Check `VectorLayerUploader.tsx` includes course selector
3. Verify FormData includes `course_name` field

### Issue: Upload succeeds but file not in R2
**Cause:** R2 credentials or bucket name incorrect

**Solution:**
1. Check secrets: `supabase secrets list`
2. Verify bucket name: `CLOUDFLARE_R2_BUCKET_NAME=map-stats-tiles-prod`
3. Test R2 access from Cloudflare dashboard

### Issue: "Course dropdown is empty"
**Cause:** No courses in `golf_course_tilesets` for selected club

**Solution:**
```sql
-- Check courses exist
SELECT id, name, r2_folder_path, golf_club_id
FROM golf_course_tilesets
WHERE is_active = true;

-- If empty, create a test course
INSERT INTO golf_course_tilesets (
  golf_club_id,
  name,
  r2_folder_path,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon
) VALUES (
  'your-golf-club-id',
  'Test Course 20',
  'test20/tiles',
  40.0, 40.1, -74.0, -73.9,
  40.05, -73.95
);
```

## Rollback Plan

If something goes wrong:

### Rollback Migration
```sql
-- Remove course_name column
ALTER TABLE vector_layers DROP COLUMN IF EXISTS course_name;

-- Drop indexes
DROP INDEX IF EXISTS idx_vector_layers_course_name;
DROP INDEX IF EXISTS idx_vector_layers_club_course;
```

### Rollback Edge Function
```bash
# Revert to previous version (if you have git history)
git checkout HEAD~1 supabase/functions/upload-vector-layer/index.ts
supabase functions deploy upload-vector-layer
```

## Post-Deployment Verification

### 1. Function Health Check
```bash
# Check function logs for errors
supabase functions logs upload-vector-layer --limit 50

# Should see successful uploads, not boot errors
```

### 2. Database Check
```sql
-- Verify course_name is populated for new uploads
SELECT 
  COUNT(*) as total_layers,
  COUNT(course_name) as with_course_name,
  COUNT(*) - COUNT(course_name) as missing_course_name
FROM vector_layers;

-- All new uploads should have course_name
```

### 3. R2 Storage Check
```
Verify path structure in Cloudflare R2:
map-stats-tiles-prod/
  ├── test20/
  │   ├── tiles/           ← Raster tiles
  │   └── Vector_Layers/   ← Vector layers (NEW)
```

### 4. Frontend Check
- [ ] Course dropdown loads courses
- [ ] R2 path preview shows correct format
- [ ] Upload completes without errors
- [ ] Success toast appears
- [ ] Layer appears in layer list

## Next Steps

After successful deployment:

1. **Test with Real Data**
   - Upload actual fairways, greens, bunkers GeoJSON
   - Verify layers display correctly

2. **Implement Swipe Feature**
   - See `VECTOR_LAYER_SWIPE_GUIDE.md`
   - Install: `npm install mapbox-gl-compare`
   - Create `MapSwipeControl` component

3. **Add Layer Management**
   - Edit layer styles
   - Toggle layer visibility
   - Reorder layers (z-index)
   - Delete layers

4. **Performance Optimization**
   - Simplify large GeoJSON files
   - Consider vector tiles for huge datasets
   - Add layer caching

## Support Resources

- **Fix Summary:** `VECTOR_LAYER_FIX_SUMMARY.md`
- **Swipe Guide:** `VECTOR_LAYER_SWIPE_GUIDE.md`
- **Supabase Docs:** https://supabase.com/docs/guides/functions
- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2/

## Success Criteria

✅ All checks should pass:

- [ ] Migration deployed without errors
- [ ] Edge function deploys without boot errors
- [ ] Can upload vector layer via UI
- [ ] R2 path matches: `{course_name}/Vector_Layers/{layer}.geojson`
- [ ] Database record has `course_name` populated
- [ ] Can fetch vector layers by `course_name`
- [ ] GeoJSON accessible via R2 public URL

## Deployment Complete! 🎉

Your vector layer upload system is now fixed and ready to use with the new R2 path structure.

**What Changed:**
- ✅ Fixed `AwsV4Signer` import error
- ✅ Updated R2 path to `test20/Vector_Layers/`
- ✅ Added course selector to upload UI
- ✅ Added `course_name` column to database
- ✅ Ready for swipe feature implementation

**Next:** Implement the swipe feature using `VECTOR_LAYER_SWIPE_GUIDE.md`
