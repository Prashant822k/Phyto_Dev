# Vector Overlay Map - Fixed Issues

## Problems Fixed

### 1. ❌ Map Showing San Francisco Instead of Golf Course
**Problem:** Vector overlay map was initializing with default coordinates `[-122.4, 37.8]` (San Francisco)

**Fix:** Now fetches golf course bounds from `golf_course_tilesets` table and centers map correctly

```typescript
// Get golf course tileset for bounds
const { data: tileset } = await supabase
  .from('golf_course_tilesets')
  .select('*')
  .eq('golf_club_id', golfClubId)
  .eq('is_active', true)
  .limit(1)
  .single();

// Use course bounds
setCourseBounds([
  [tileset.min_lon, tileset.min_lat],
  [tileset.max_lon, tileset.max_lat]
]);
setCourseCenter([tileset.center_lon, tileset.center_lat]);
```

### 2. ❌ R2_PUBLIC_URL Not Configured Error
**Problem:** Component required `VITE_R2_PUBLIC_URL` environment variable

**Fix:** Added fallback to use edge function if R2_PUBLIC_URL not set

```typescript
if (r2PublicUrl) {
  // Direct R2 access (faster)
  const geojsonUrl = `${r2PublicUrl}/${layer.r2_key}`;
  const response = await fetch(geojsonUrl);
  geojsonData = await response.json();
} else {
  // Fallback: Use edge function (works without R2_PUBLIC_URL)
  const response = await fetch(
    `${supabaseUrl}/functions/v1/get-vector-layers?golf_course_id=${golfClubId}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const result = await response.json();
  // Fetch from signed URL
  geojsonData = await fetch(result.data[0].urlWithCache).then(r => r.json());
}
```

## What Changed

### `VectorLayerOverlayMap.tsx`

**Added:**
- ✅ Fetch golf course bounds from `golf_course_tilesets`
- ✅ Use course center and bounds for map initialization
- ✅ Fallback to edge function if `R2_PUBLIC_URL` not set
- ✅ Re-initialize map when bounds are loaded

**State:**
```typescript
const [courseBounds, setCourseBounds] = useState<[[number, number], [number, number]] | null>(null);
const [courseCenter, setCourseCenter] = useState<[number, number] | null>(null);
```

**Map Config:**
```typescript
const mapConfig = {
  container: mapContainer.current,
  style: baseStyle,
  center: courseCenter || initialCenter,  // Use course center
  zoom: initialZoom,
  bounds: courseBounds || initialBounds,  // Use course bounds
  fitBoundsOptions: { padding: 50 }
};
```

## Environment Variables

### Option 1: Direct R2 Access (Faster)
```env
VITE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Pros:**
- ✅ Faster (direct access)
- ✅ No edge function calls
- ✅ Lower costs

**Cons:**
- ❌ Requires public R2 bucket
- ❌ No access control

### Option 2: Edge Function (More Secure)
Leave `VITE_R2_PUBLIC_URL` unset

**Pros:**
- ✅ Works with private R2 bucket
- ✅ Access control via edge function
- ✅ Signed URLs with expiration

**Cons:**
- ❌ Slightly slower (extra API call)
- ❌ More edge function invocations

## Testing

### Test 1: Verify Map Centers on Golf Course

1. Login as client
2. Go to dashboard
3. Check vector overlay map (right side)
4. Should show your golf course, not San Francisco

**Expected:**
```
Map center: [5.767493, 51.366951]  // Your course coordinates
Map bounds: [[5.755898, 51.361755], [5.779088, 51.372146]]
```

**Not:**
```
Map center: [-122.4, 37.8]  // San Francisco (wrong!)
```

### Test 2: Verify Layers Load

1. Check browser console
2. Should see:
   ```
   Course bounds loaded: { bounds: [...], center: [...] }
   Loading vector layer: Fairways via edge function
   ✅ Loaded vector layer: Fairways
   ```

3. Should NOT see:
   ```
   ❌ R2_PUBLIC_URL not configured
   ```

### Test 3: Verify Both Maps Show Same Area

1. Compare left map (raster) and right map (vector)
2. Both should show the same golf course
3. Both should be centered on same location
4. Zoom levels may differ slightly

## Troubleshooting

### Issue: Map still shows San Francisco

**Check:**
1. Database has tileset for this golf club:
   ```sql
   SELECT * FROM golf_course_tilesets 
   WHERE golf_club_id = 'your-club-id' 
   AND is_active = true;
   ```
2. Tileset has valid bounds:
   ```sql
   SELECT min_lon, min_lat, max_lon, max_lat, center_lon, center_lat
   FROM golf_course_tilesets 
   WHERE golf_club_id = 'your-club-id';
   ```

**Fix:**
- Ensure tileset exists and has correct coordinates
- Check console for "Course bounds loaded" message

### Issue: Layers don't load

**Check:**
1. Browser console for errors
2. Edge function logs:
   ```bash
   supabase functions logs get-vector-layers --follow
   ```
3. Database has vector layers:
   ```sql
   SELECT * FROM vector_layers 
   WHERE golf_club_id = 'your-club-id' 
   AND is_active = true;
   ```

**Fix:**
- Deploy edge function: `supabase functions deploy get-vector-layers`
- Upload vector layers via admin panel

### Issue: "Failed to fetch layers"

**Check:**
1. User is authenticated
2. Edge function is deployed
3. Database column name is `golf_club_id` (not `golf_course_id`)

**Fix:**
- Redeploy edge function with correct column name

## Summary of Fixes

| Issue | Before | After |
|-------|--------|-------|
| Map location | San Francisco | Golf course |
| Requires R2_PUBLIC_URL | Yes (error if missing) | No (fallback) |
| Bounds source | Hard-coded | From tileset |
| Center source | Hard-coded | From tileset |
| Layer loading | R2 only | R2 or edge function |

## Deploy Steps

1. **No need to redeploy edge function** - it already works
2. **Just rebuild frontend:**
   ```bash
   npm run build
   # Deploy to your hosting
   ```

3. **Test:**
   - Login as client
   - Check vector overlay map shows correct location
   - Toggle layers on/off
   - Verify no console errors

## Expected Result

### Before Fix
```
┌─────────────────────────────────────────────────────────────┐
│  Golf Course Map          │  Vector Layer Overlays          │
│  [Your golf course]       │  [San Francisco - WRONG!]       │
│  ✅ Correct location      │  ❌ Wrong location              │
└─────────────────────────────────────────────────────────────┘
```

### After Fix
```
┌─────────────────────────────────────────────────────────────┐
│  Golf Course Map          │  Vector Layer Overlays          │
│  [Your golf course]       │  [Your golf course]             │
│  ✅ Correct location      │  ✅ Correct location            │
│  ✅ Raster tiles          │  ✅ Vector overlays             │
└─────────────────────────────────────────────────────────────┘
```

Both maps now show the same golf course! 🎉

## Optional: Add R2_PUBLIC_URL for Better Performance

If you want faster layer loading, add to `.env`:

```env
VITE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

Then rebuild:
```bash
npm run build
```

This will use direct R2 access instead of edge function, making layer loading faster.

But it's **optional** - the fallback method works fine!
