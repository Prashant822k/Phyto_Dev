# 🧪 Complete Testing Guide - Multi-Date Layer Comparison

## Understanding the System

### How Zoom Levels Work

**Important:** Each tileset contains tiles for ALL zoom levels (14-20). You don't need separate uploads for each zoom level.

```
Single Upload = One Complete Tileset = All Zoom Levels

Example Upload Structure:
tiles/
  14/
    2621/
      6331.png
  15/
    5242/
      12663.png
  16/
    10485/
      25327.png
  ...
  20/
    (tiles for zoom 20)
```

When you upload this once with a specific date/time, Mapbox automatically shows the correct zoom level as users zoom in/out.

---

## 🎯 Complete Testing Workflow

### Phase 1: Deploy Edge Function (One-Time Setup)

**Deploy r2-sign with date/time support:**

```bash
# In your terminal
npx supabase functions deploy r2-sign
```

Or manually via Supabase Dashboard → Edge Functions.

See `DEPLOY_EDGE_FUNCTION.md` for details.

---

### Phase 2: Prepare Test Data

You need tiles from **2 different dates** to test layer comparison.

#### Option A: Use Same Tiles with Different Dates (Quick Test)

For testing the UI/functionality, you can upload the same tiles twice with different dates:

**Upload 1:**
- Date: `2024-11-01`
- Time: `10:30`
- Tiles: your-tiles.zip (zoom 14-20)

**Upload 2:**
- Date: `2024-11-03`  
- Time: `14:30`
- Tiles: same-tiles.zip (zoom 14-20)

This tests the layer selection and swipe functionality even though imagery is identical.

#### Option B: Use Different Imagery (Real Test)

If you have actual drone flights from different dates:

**Upload 1:**
- Date: `2024-11-01`
- Time: `10:30`
- Tiles: flight-nov-1.zip

**Upload 2:**
- Date: `2024-11-03`
- Time: `14:30`
- Tiles: flight-nov-3.zip

This shows real differences in the imagery.

---

### Phase 3: Upload Tiles via Frontend

#### Step 1: Go to Tile Upload Page

```
http://localhost:5173/tile-upload
```

#### Step 2: Upload First Tileset

1. **Course ID:** `the-best-golf`
2. **Flight Date:** `2024-11-01`
3. **Flight Time:** `10:30`
4. **Select ZIP** or **Select Folder**
5. Wait for upload to complete

**What happens:**
- Tiles upload to R2: `the-best-golf/2024-11-01/10-30/tiles/{z}/{x}/{y}.png`
- All zoom levels (14-20) are uploaded
- Progress bar shows upload status

#### Step 3: Upload Second Tileset

1. **Course ID:** `the-best-golf` (same course!)
2. **Flight Date:** `2024-11-03`
3. **Flight Time:** `14:30`
4. **Select ZIP** or **Select Folder**
5. Wait for upload to complete

**What happens:**
- Tiles upload to R2: `the-best-golf/2024-11-03/14-30/tiles/{z}/{x}/{y}.png`
- All zoom levels (14-20) are uploaded
- Now you have 2 complete tilesets for the same course

---

### Phase 4: Create Tileset Metadata Records

For each upload, create a database record:

#### Method 1: Use TilesetMetadataUploader (Recommended)

1. Go to admin dashboard
2. Find **TilesetMetadataUploader** component
3. **For First Tileset:**
   - Select Golf Course: "The Best Golf"
   - Flight Date: `2024-11-01`
   - Flight Time: `10:30`
   - Upload `metadata.json` (contains bounds, zoom levels, etc.)
   - Click Upload

4. **For Second Tileset:**
   - Select Golf Course: "The Best Golf"
   - Flight Date: `2024-11-03`
   - Flight Time: `14:30`
   - Upload `metadata.json`
   - Click Upload

#### Method 2: Manual SQL (Alternative)

```sql
-- First tileset
INSERT INTO golf_course_tilesets (
  golf_club_id,
  name,
  description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path,
  tile_size,
  format,
  is_active,
  flight_date,
  flight_time
) VALUES (
  'YOUR_GOLF_CLUB_ID',
  'The Best Golf',
  'Flight from November 1st',
  40.7128, 40.7228, -74.0060, -73.9960,  -- Replace with actual bounds
  40.7178, -74.0010,  -- Replace with actual center
  14, 20, 16,
  'the-best-golf/2024-11-01/10-30/tiles',
  256,
  'png',
  true,
  '2024-11-01',
  '10:30:00'
);

-- Second tileset
INSERT INTO golf_course_tilesets (
  golf_club_id,
  name,
  description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path,
  tile_size,
  format,
  is_active,
  flight_date,
  flight_time
) VALUES (
  'YOUR_GOLF_CLUB_ID',
  'The Best Golf',
  'Flight from November 3rd',
  40.7128, 40.7228, -74.0060, -73.9960,
  40.7178, -74.0010,
  14, 20, 16,
  'the-best-golf/2024-11-03/14-30/tiles',
  256,
  'png',
  true,
  '2024-11-03',
  '14:30:00'
);
```

---

### Phase 5: Test Layer Selection & Comparison

#### Step 1: Open Test Page

```
http://localhost:5173/test-layers
```

#### Step 2: Select Golf Course

From dropdown, select "The Best Golf"

#### Step 3: View Available Layers

Click **"Layers"** button

**You should see:**
```
┌─────────────────────────────────────┐
│ Map Overlays                  [0/2] │
├─────────────────────────────────────┤
│ The Best Golf                       │
│                                     │
│ 📅 Nov 3, 2024  🕐 14:30     [OFF] │
│ Flight from November 3rd            │
│                                     │
│ 📅 Nov 1, 2024  🕐 10:30     [OFF] │
│ Flight from November 1st            │
└─────────────────────────────────────┘
```

#### Step 4: Enable Single Layer (Test Zoom Levels)

1. **Toggle ON** the Nov 3 layer
2. **Zoom in/out** on the map
3. **Observe:** Tiles automatically change as you zoom
   - Zoom 14: Shows zoom 14 tiles
   - Zoom 15: Shows zoom 15 tiles
   - Zoom 16: Shows zoom 16 tiles
   - etc.

**This proves:** All zoom levels work for a single layer

#### Step 5: Enable Two Layers (Test Comparison)

1. **Toggle ON** both layers (Nov 1 and Nov 3)
2. **"Swipe Compare" button appears**
3. **Click "Swipe Compare"**
4. **Drag the slider** left and right

**What you should see:**
- Left side: Nov 1 layer
- Right side: Nov 3 layer
- As you zoom in/out, BOTH layers show correct zoom level tiles
- Slider allows you to compare the two dates

#### Step 6: Test Zoom During Swipe

1. **Keep swipe mode active**
2. **Zoom in** (e.g., from 16 to 18)
3. **Observe:** Both layers update to show zoom 18 tiles
4. **Drag slider:** Still works, showing comparison at zoom 18

**This proves:** Swipe comparison works across all zoom levels

---

## 🔍 How Layers Work Technically

### Single Layer Display

```
User zooms to level 16
↓
Mapbox requests: /tile-proxy?tilesetId=xxx&z=16&x=10485&y=25327
↓
Edge function fetches: the-best-golf/2024-11-03/14-30/tiles/16/10485/25327.png
↓
Tile displays on map
```

### Two Layer Comparison (Swipe)

```
User zooms to level 16, drags swipe slider
↓
Left side requests: tilesetId=tileset1&z=16&x=10485&y=25327
Right side requests: tilesetId=tileset2&z=16&x=10485&y=25327
↓
Left: the-best-golf/2024-11-01/10-30/tiles/16/10485/25327.png
Right: the-best-golf/2024-11-03/14-30/tiles/16/10485/25327.png
↓
Both tiles display, split by slider position
```

**Key Point:** Mapbox handles zoom level switching automatically. You just provide the tile URL template with `{z}`, `{x}`, `{y}` placeholders.

---

## 📊 Testing Checklist

### Upload Phase
- [ ] Edge function deployed
- [ ] First tileset uploaded (all zoom levels 14-20)
- [ ] Second tileset uploaded (all zoom levels 14-20)
- [ ] Both uploads show success message
- [ ] R2 bucket shows correct folder structure

### Metadata Phase
- [ ] First tileset metadata created in database
- [ ] Second tileset metadata created in database
- [ ] Both have correct `r2_folder_path`
- [ ] Both have correct `flight_date` and `flight_time`
- [ ] SQL query shows both tilesets for same golf_club_id

### Display Phase
- [ ] Test page loads without errors
- [ ] Golf course selector shows course
- [ ] "Layers" button shows count (2)
- [ ] Layer selector shows both tilesets
- [ ] Dates and times display correctly

### Single Layer Phase
- [ ] Can enable one layer
- [ ] Layer displays on map
- [ ] Can zoom in (14 → 20)
- [ ] Can zoom out (20 → 14)
- [ ] Tiles load at each zoom level
- [ ] No missing tiles or errors

### Comparison Phase
- [ ] Can enable two layers
- [ ] "Swipe Compare" button appears
- [ ] Can activate swipe mode
- [ ] Slider is draggable
- [ ] Left side shows first layer
- [ ] Right side shows second layer
- [ ] Can zoom while in swipe mode
- [ ] Both layers update when zooming
- [ ] Slider still works after zoom

---

## 🎯 Expected Results

### What You Should See

1. **Layer Selector:**
   - 2 tilesets listed
   - Different dates/times shown
   - Toggle switches work
   - Counter shows "2/2" when both enabled

2. **Single Layer View:**
   - Map shows tiles from selected date
   - Zoom in/out works smoothly
   - All zoom levels (14-20) load correctly

3. **Swipe Comparison:**
   - Vertical slider appears
   - Left side: older date (Nov 1)
   - Right side: newer date (Nov 3)
   - Dragging slider reveals more of each layer
   - Zooming works in swipe mode

4. **Zoom Level Behavior:**
   - Zoom 14: Low detail, large area
   - Zoom 16: Medium detail
   - Zoom 18: High detail
   - Zoom 20: Maximum detail, small area
   - Both layers always show same zoom level

---

## 🚨 Troubleshooting

### Issue: "No tilesets found"
**Check:**
```sql
SELECT * FROM golf_course_tilesets WHERE golf_club_id = 'YOUR_ID';
```
**Solution:** Create metadata records

### Issue: Tiles don't load
**Check:**
1. R2 bucket has tiles in correct path
2. Edge function is deployed
3. `r2_folder_path` matches actual R2 path
4. Authentication token is valid

### Issue: Only one zoom level works
**Check:**
1. Did you upload tiles for all zoom levels (14-20)?
2. Check R2 bucket structure:
   ```
   course/date/time/tiles/
     14/ ✓
     15/ ✓
     16/ ✓
     ...
     20/ ✓
   ```

### Issue: Swipe doesn't work
**Check:**
1. Exactly 2 layers enabled?
2. Both layers have tiles loaded?
3. Browser console for errors?

---

## 📈 Performance Notes

### Tile Loading
- Mapbox loads tiles on-demand
- Only visible tiles are fetched
- Tiles are cached by browser
- Zoom changes trigger new tile requests

### Multiple Layers
- Each layer loads independently
- 2 layers = 2x tile requests
- Swipe mode doesn't affect performance
- Caching helps with repeated views

---

## ✅ Success Criteria

You've successfully tested the system when:

1. ✅ Can upload tiles with date/time
2. ✅ Can create multiple tilesets for same course
3. ✅ Can view single layer across all zoom levels
4. ✅ Can compare two layers with swipe
5. ✅ Swipe works while zooming
6. ✅ All zoom levels (14-20) display correctly
7. ✅ No console errors
8. ✅ Tiles load within 1-2 seconds

---

## 🎓 Summary

**Key Concepts:**
- One upload = One complete tileset = All zoom levels
- Each tileset has a unique date/time
- Mapbox handles zoom level switching automatically
- Swipe compares two complete tilesets
- Both layers always show the same zoom level

**Testing Flow:**
1. Deploy edge function
2. Upload tiles (2 different dates)
3. Create metadata records
4. Test single layer + zoom
5. Test two layers + swipe + zoom

**What Makes It Work:**
- R2 path includes date/time: `course/YYYY-MM-DD/HH-MM/tiles/{z}/{x}/{y}.png`
- Database stores date/time for each tileset
- Frontend selects layers by date/time
- Mapbox requests correct zoom level tiles
- Edge function serves tiles from correct path

---

Ready to test? Follow the phases in order! 🚀
