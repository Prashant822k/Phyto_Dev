# 🎯 Testing Summary - Ready to Test!

## ✅ Everything is Ready

All code has been implemented and integrated. You can now test the layer selection and swipe functionality!

---

## 📋 Quick Start (Copy-Paste Commands)

### 1. Run Database Migration

**In Supabase SQL Editor:**
```sql
-- Copy from add-datetime-to-tilesets.sql and run
ALTER TABLE public.golf_course_tilesets
ADD COLUMN IF NOT EXISTS flight_date DATE,
ADD COLUMN IF NOT EXISTS flight_time TIME,
ADD COLUMN IF NOT EXISTS flight_datetime TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_tilesets_flight_date 
ON public.golf_course_tilesets(golf_club_id, flight_date DESC);

CREATE INDEX IF NOT EXISTS idx_tilesets_flight_datetime 
ON public.golf_course_tilesets(golf_club_id, flight_datetime DESC);

ALTER TABLE public.golf_course_tilesets 
DROP CONSTRAINT IF EXISTS golf_course_tilesets_golf_club_id_name_key;

ALTER TABLE public.golf_course_tilesets
ADD CONSTRAINT golf_course_tilesets_unique_flight 
UNIQUE(golf_club_id, name, flight_date, flight_time);

CREATE OR REPLACE FUNCTION update_flight_datetime()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.flight_date IS NOT NULL AND NEW.flight_time IS NOT NULL THEN
    NEW.flight_datetime := NEW.flight_date + NEW.flight_time;
  ELSIF NEW.flight_date IS NOT NULL THEN
    NEW.flight_datetime := NEW.flight_date::timestamp;
  ELSE
    NEW.flight_datetime := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_flight_datetime
BEFORE INSERT OR UPDATE OF flight_date, flight_time
ON public.golf_course_tilesets
FOR EACH ROW
EXECUTE FUNCTION update_flight_datetime();
```

### 2. Find Your Tileset ID

**In Supabase SQL Editor:**
```sql
SELECT id, golf_club_id, name, r2_folder_path 
FROM golf_course_tilesets 
ORDER BY created_at DESC 
LIMIT 1;
```

**Copy the `id` value** (it looks like: `550e8400-e29b-41d4-a716-446655440000`)

### 3. Create Test Tilesets

**Replace `YOUR_TILESET_ID` with the ID you copied above, then run:**

```sql
-- Test Tileset 1 (Nov 1, 2024)
INSERT INTO golf_course_tilesets (
  golf_club_id, name, description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path, tile_url_pattern, tile_size, format,
  attribution, metadata, is_active,
  flight_date, flight_time
)
SELECT 
  golf_club_id, name, 'Test Flight - November 1st Morning',
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path, tile_url_pattern, tile_size, format,
  attribution, metadata, true,
  '2024-11-01'::date, '10:30:00'::time
FROM golf_course_tilesets
WHERE id = 'e05890c9-3524-4c13-8dc7-1a7e2a577e10';

-- Test Tileset 2 (Nov 3, 2024)
INSERT INTO golf_course_tilesets (
  golf_club_id, name, description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path, tile_url_pattern, tile_size, format,
  attribution, metadata, is_active,
  flight_date, flight_time
)
SELECT 
  golf_club_id, name, 'Test Flight - November 3rd Afternoon',
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path, tile_url_pattern, tile_size, format,
  attribution, metadata, true,
  '2024-11-03'::date, '14:30:00'::time
FROM golf_course_tilesets
WHERE id = 'e05890c9-3524-4c13-8dc7-1a7e2a577e10';
```

### 4. Verify Test Data

```sql
SELECT 
  name, description,
  flight_date, flight_time, flight_datetime,
  is_active
FROM golf_course_tilesets
ORDER BY flight_datetime DESC NULLS LAST;
```

**Expected:** 3 tilesets (1 original + 2 test tilesets)

### 5. Start Dev Server

```bash
npm run dev
```

### 6. Open Test Page

**Visit:** `http://localhost:5173/test-layers`

---

## 🎮 How to Test

### Test Layer Selection

1. **Open test page:** `/test-layers`
2. **Select golf course** from dropdown
3. **Click "Layers" button** (top-left of map)
4. **See layer selector panel** appear below map
5. **Verify you see:**
   - ✅ 3 tilesets listed
   - ✅ Dates and times displayed (Nov 1, Nov 3, and one without date)
   - ✅ Toggle switches for each
   - ✅ Counter showing "X/2"

### Test Layer Toggle

1. **Click toggle switches** to turn layers on/off
2. **Verify:**
   - ✅ Can enable up to 2 layers
   - ✅ Counter updates (e.g., "2/2")
   - ✅ Can't enable 3rd layer when 2 are active
   - ✅ Message appears: "Maximum 2 layers selected"

### Test Swipe Comparison

1. **Enable exactly 2 layers**
2. **Verify "Swipe Compare" button appears**
3. **Click "Swipe Compare"**
4. **Verify:**
   - ✅ Button changes to "Exit Swipe Mode"
   - ✅ Vertical slider appears on map
   - ✅ Slider has a draggable handle
5. **Drag the slider left and right**
6. **Verify:**
   - ✅ Slider moves smoothly
   - ✅ Cursor changes to resize icon
   - ✅ Layers visible on both sides

---

## 📸 What You Should See

### Initial Load
```
┌─────────────────────────────────────────┐
│ Layer Selection & Swipe Test           │
├─────────────────────────────────────────┤
│ [Instructions card]                     │
│                                         │
│ Select Golf Course: [Dropdown ▼]       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Golf Course Map        Zoom: 17  [1/2]  │
├─────────────────────────────────────────┤
│ [Layers (3)]              [−] [+] [⛶]  │
├─────────────────────────────────────────┤
│                                         │
│           [MAP DISPLAY]                 │
│                                         │
└─────────────────────────────────────────┘
```

### Layer Selector Open
```
┌─────────────────────────────────────────┐
│ Map Overlays                      [2/2] │
├─────────────────────────────────────────┤
│ Golf Course Name                        │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📅 Nov 3, 2024  🕐 14:30      [ON] │ │
│ │ Test Flight - November 3rd          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📅 Nov 1, 2024  🕐 10:30      [ON] │ │
│ │ Test Flight - November 1st          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ (No date)                     [OFF] │ │
│ │ Original tileset                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ Maximum 2 layers selected            │
└─────────────────────────────────────────┘
```

### Swipe Mode Active
```
┌─────────────────────────────────────────┐
│ [Layers (3)]  [Exit Swipe Mode]         │
├─────────────────────────────────────────┤
│                    │                    │
│    Layer 1         │      Layer 2       │
│  (Nov 1, 2024)     │   (Nov 3, 2024)    │
│                   ◉│◉                   │
│                    │                    │
│                    │                    │
└────────────────────┴────────────────────┘
              ← Drag →
```

---

## ✅ Success Criteria

| Feature | Status |
|---------|--------|
| Database migration runs | ⬜ |
| Test tilesets created | ⬜ |
| Test page loads | ⬜ |
| Map displays | ⬜ |
| Layer selector opens | ⬜ |
| Shows 3 tilesets | ⬜ |
| Dates/times visible | ⬜ |
| Toggle switches work | ⬜ |
| Max 2 layers enforced | ⬜ |
| Swipe button appears | ⬜ |
| Swipe slider draggable | ⬜ |
| Layers switch on drag | ⬜ |

---

## 🐛 Common Issues

### "No tilesets found"
- Check: Do you have tilesets in database?
- Run: `SELECT COUNT(*) FROM golf_course_tilesets;`

### Layers button shows "(0)"
- Check: Does golf_club_id match?
- Run: `SELECT DISTINCT golf_club_id FROM golf_course_tilesets;`

### Swipe button missing
- Check: Are exactly 2 layers enabled?
- Solution: Toggle layers until counter shows "2/2"

### TypeScript errors
- Run: `npm install`

### Map doesn't load
- Check: `VITE_MAPBOX_ACCESS_TOKEN` in `.env`
- Check: Browser console for errors

---

## 📁 Files Created for Testing

- ✅ `src/pages/TestLayers.tsx` - Test page component
- ✅ `src/components/LayerSelector.tsx` - Layer selection UI
- ✅ `src/components/MapSwipeControl.tsx` - Swipe comparison
- ✅ `src/components/MapboxGolfCourseMap.tsx` - Updated map component
- ✅ `add-datetime-to-tilesets.sql` - Database migration
- ✅ `create-test-tilesets.sql` - Test data creation
- ✅ `QUICK_TEST_GUIDE.md` - Detailed testing guide
- ✅ `TEST_LAYER_SETUP.md` - Setup instructions

---

## 🎯 After Testing

Once you confirm everything works:

1. **Report results** - What works? Any issues?
2. **Fix tile upload** - Update to support date/time paths
3. **Upload real tiles** - With new structure
4. **Test with real data** - Compare actual imagery

---

## 📞 Ready to Test!

**Follow these steps:**

1. ✅ Copy-paste migration SQL → Run in Supabase
2. ✅ Find your tileset ID → Copy it
3. ✅ Create test tilesets → Replace ID and run SQL
4. ✅ Start dev server → `npm run dev`
5. ✅ Open test page → `/test-layers`
6. ✅ Test layer selection → Click "Layers" button
7. ✅ Test swipe → Enable 2 layers, click "Swipe Compare"

**Let me know what happens!** 🚀
