# Quick Deploy: Vector Layer Overlay System

## What You're Deploying

A **side-by-side map view** for golf course clients:
- **Left Map:** Raster satellite imagery (existing)
- **Right Map:** Vector layer overlays (NEW)

Clients can toggle individual overlays (fairways, greens, bunkers, etc.) on/off.

## Files Changed

### ✅ Created
- `src/components/VectorLayerOverlayMap.tsx` - New map component for vector overlays

### ✅ Modified
- `src/pages/DashboardClient.tsx` - Added side-by-side layout
- `supabase/functions/get-vector-layers/index.ts` - Fixed column name

## Deploy Steps

### 1. Deploy Edge Function

```bash
# Deploy the fixed get-vector-layers function
supabase functions deploy get-vector-layers
```

**Expected output:**
```
Deploying function get-vector-layers...
✓ Function deployed successfully
```

### 2. Verify Environment Variables

Make sure these are set in your `.env`:

```env
# Required for vector overlays
VITE_R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Already configured (no changes needed)
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

### 3. Build and Deploy Frontend

```bash
# Install dependencies (if needed)
npm install

# Build
npm run build

# Deploy (your deployment method)
# e.g., Vercel, Netlify, etc.
```

## Test the System

### Step 1: Upload Vector Layers (Admin)

1. Login as admin
2. Go to Vector Layers page
3. Select golf course: "Test Course 20"
4. Upload GeoJSON files:
   - `fairways.geojson`
   - `greens.geojson`
   - `bunkers.geojson`
5. Click "Upload 3 Layers"

**Expected result:**
```
✅ Successfully uploaded 3 layers
```

**Verify in R2:**
```
map-stats-tiles-prod/
└── test20/
    └── Vector_Layers/
        ├── .keep
        ├── fairways.geojson
        ├── greens.geojson
        └── bunkers.geojson
```

### Step 2: View as Client

1. Login as client user (assigned to Test Course 20)
2. Go to Dashboard
3. Should see **two maps side by side:**
   - Left: Satellite imagery with date selector
   - Right: Vector overlays with toggle switches

**Expected view:**
```
┌─────────────────────────────────────────────────────────────┐
│  Golf Course Map          │  Vector Layer Overlays          │
│  [Satellite imagery]      │  [Satellite + vector overlays]  │
│  • Date: 2024-11-05       │  ☑ Fairways (green)            │
│  • Time: 14:30            │  ☑ Greens (dark green)         │
│                           │  ☑ Bunkers (sandy brown)       │
└─────────────────────────────────────────────────────────────┘
```

### Step 3: Test Toggle Functionality

1. Click toggle switch for "Fairways"
2. Fairways should disappear from map
3. Click again to show them
4. Click "Hide All" button
5. All layers should disappear
6. Click "Show All" button
7. All layers should reappear

## Troubleshooting

### Issue: Right map shows "No vector layers found"

**Fix:**
1. Check database has records:
   ```sql
   SELECT * FROM vector_layers WHERE golf_club_id = 'your-club-id';
   ```
2. Verify `is_active = true`
3. Check files exist in R2

### Issue: Layers don't load

**Fix:**
1. Check browser console for errors
2. Verify `VITE_R2_PUBLIC_URL` is set correctly
3. Test R2 URL directly: `https://pub-xxx.r2.dev/test20/Vector_Layers/fairways.geojson`

### Issue: Wrong colors

**Fix:**
- Layer names should include keywords:
  - "fairway" → green
  - "green" → dark green
  - "bunker" or "sand" → sandy brown
  - "water" → blue

### Issue: Maps not side by side

**Fix:**
- On desktop: Should be side by side
- On mobile: Should stack vertically
- Check browser width > 1024px for side-by-side

## Quick Verification Commands

### Check Edge Function Logs
```bash
supabase functions logs get-vector-layers --follow
```

### Check Database Records
```sql
-- Count vector layers per course
SELECT course_name, COUNT(*) 
FROM vector_layers 
WHERE is_active = true 
GROUP BY course_name;

-- List all layers for a course
SELECT name, r2_key, created_at 
FROM vector_layers 
WHERE golf_club_id = 'your-club-id' 
AND is_active = true 
ORDER BY z_index;
```

### Test R2 Access
```bash
# Should return GeoJSON data
curl https://pub-xxx.r2.dev/test20/Vector_Layers/fairways.geojson
```

## Success Checklist

- [ ] Edge function deployed without errors
- [ ] Frontend built and deployed
- [ ] Admin can upload vector layers
- [ ] Files appear in R2 under `{course}/Vector_Layers/`
- [ ] Database records created
- [ ] Client dashboard shows two maps
- [ ] Vector layers load on right map
- [ ] Toggle switches work
- [ ] Layers have correct colors
- [ ] No console errors

## What Clients Will See

### Before (Single Map)
```
┌─────────────────────────────────┐
│  Golf Course Map                │
│  [Satellite imagery only]       │
│  • Date selector                │
│  • Zoom controls                │
└─────────────────────────────────┘
```

### After (Dual Maps)
```
┌─────────────────────────────────────────────────────────────┐
│  Golf Course Map          │  Vector Layer Overlays          │
│  [Raster tiles]           │  [Vector overlays]              │
│  • Date: 2024-11-05       │  ☑ Fairways                    │
│  • Time: 14:30            │  ☑ Greens                      │
│  • Swipe comparison       │  ☑ Bunkers                     │
│                           │  ☑ Water Hazards               │
│                           │  [Show All] [Hide All]         │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps (Optional)

### Add Swipe Between Maps

To add swipe comparison between raster and vector maps:

1. Install mapbox-gl-compare:
   ```bash
   npm install mapbox-gl-compare
   ```

2. Implement swipe control (see `VECTOR_OVERLAY_IMPLEMENTATION.md`)

### Add Layer Styling UI

Allow clients to customize colors:
- Color picker for each layer
- Opacity slider
- Line width control

### Add Measurement Tools

Allow clients to measure distances/areas:
- Install `@mapbox/mapbox-gl-draw`
- Add measurement controls

## Support

**Documentation:**
- `VECTOR_OVERLAY_IMPLEMENTATION.md` - Complete technical guide
- `MULTIPLE_UPLOAD_FEATURE.md` - Upload system details
- `FINAL_FIX_NATIVE_CRYPTO.md` - Edge function fixes

**Edge Functions:**
- `upload-vector-layer` - Handles GeoJSON uploads to R2
- `get-vector-layers` - Fetches layers for display

**Components:**
- `VectorLayerOverlayMap.tsx` - Vector overlay map
- `MapboxGolfCourseMap.tsx` - Raster tileset map
- `VectorLayerUploader.tsx` - Admin upload UI

## Deploy Now! 🚀

```bash
# 1. Deploy edge function
supabase functions deploy get-vector-layers

# 2. Build frontend
npm run build

# 3. Deploy frontend (your method)

# 4. Test as admin (upload layers)

# 5. Test as client (view maps)
```

That's it! Your vector overlay system is live! 🎉
