# Testing Layer Selection & Swipe Functionality

## Step 1: Run Database Migration

**Go to Supabase Dashboard → SQL Editor**

Copy and paste this SQL:

```sql
-- Migration: Add date/time fields to golf_course_tilesets
-- This allows storing multiple tilesets for the same golf course from different dates/times

-- Add new columns for flight date and time
ALTER TABLE public.golf_course_tilesets
ADD COLUMN IF NOT EXISTS flight_date DATE,
ADD COLUMN IF NOT EXISTS flight_time TIME,
ADD COLUMN IF NOT EXISTS flight_datetime TIMESTAMP;

-- Create index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_tilesets_flight_date 
ON public.golf_course_tilesets(golf_club_id, flight_date DESC);

CREATE INDEX IF NOT EXISTS idx_tilesets_flight_datetime 
ON public.golf_course_tilesets(golf_club_id, flight_datetime DESC);

-- Update the unique constraint to allow multiple tilesets per course with different dates
-- First, drop the old constraint
ALTER TABLE public.golf_course_tilesets 
DROP CONSTRAINT IF EXISTS golf_course_tilesets_golf_club_id_name_key;

-- Add new unique constraint that includes flight_date and flight_time
-- This allows same course to have multiple datasets from different dates/times
ALTER TABLE public.golf_course_tilesets
ADD CONSTRAINT golf_course_tilesets_unique_flight 
UNIQUE(golf_club_id, name, flight_date, flight_time);

-- Add comment explaining the new structure
COMMENT ON COLUMN public.golf_course_tilesets.flight_date IS 'Date of the drone flight (YYYY-MM-DD)';
COMMENT ON COLUMN public.golf_course_tilesets.flight_time IS 'Approximate time of the drone flight (HH:MM:SS), extracted from tile metadata';
COMMENT ON COLUMN public.golf_course_tilesets.flight_datetime IS 'Combined date and time for easier sorting and filtering';

-- Create a trigger to automatically set flight_datetime when flight_date or flight_time changes
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

-- Example: Update r2_folder_path format for new tilesets
-- Old format: "course-name/tiles"
-- New format: "course-name/2024-11-03/14-30/tiles"
COMMENT ON COLUMN public.golf_course_tilesets.r2_folder_path IS 
'R2 folder path. New format: {course-name}/{YYYY-MM-DD}/{HH-MM}/tiles. Legacy format: {course-name}/tiles';
```

**Click "Run"** ✅

---

## Step 2: Check Your Existing Tilesets

**In Supabase SQL Editor, run:**

```sql
SELECT 
  id,
  golf_club_id,
  name,
  r2_folder_path,
  flight_date,
  flight_time,
  created_at
FROM golf_course_tilesets
ORDER BY created_at DESC;
```

**Note down:**
- How many tilesets you have
- Which golf_club_id they belong to
- Their r2_folder_path

---

## Step 3: Create Test Tilesets (2 Options)

### Option A: Add Date/Time to Existing Tileset

If you have an existing tileset, duplicate it with different dates:

```sql
-- Get your existing tileset
SELECT * FROM golf_course_tilesets LIMIT 1;

-- Duplicate it with date 2024-11-01
INSERT INTO golf_course_tilesets (
  golf_club_id,
  name,
  description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path,
  tile_url_pattern,
  tile_size,
  format,
  attribution,
  is_active,
  flight_date,
  flight_time
)
SELECT 
  golf_club_id,
  name,
  'Flight from November 1st' as description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path, -- Keep same path for testing (tiles will be same)
  tile_url_pattern,
  tile_size,
  format,
  attribution,
  true as is_active,
  '2024-11-01'::date as flight_date,
  '10:30:00'::time as flight_time
FROM golf_course_tilesets
WHERE id = 'YOUR_EXISTING_TILESET_ID'; -- Replace with actual ID

-- Duplicate again with date 2024-11-03
INSERT INTO golf_course_tilesets (
  golf_club_id,
  name,
  description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path,
  tile_url_pattern,
  tile_size,
  format,
  attribution,
  is_active,
  flight_date,
  flight_time
)
SELECT 
  golf_club_id,
  name,
  'Flight from November 3rd' as description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path, -- Keep same path for testing
  tile_url_pattern,
  tile_size,
  format,
  attribution,
  true as is_active,
  '2024-11-03'::date as flight_date,
  '14:30:00'::time as flight_time
FROM golf_course_tilesets
WHERE id = 'YOUR_EXISTING_TILESET_ID'; -- Replace with actual ID
```

### Option B: Use TilesetMetadataUploader

1. Go to your admin dashboard
2. Use the **TilesetMetadataUploader** component
3. Create 2 tilesets with different dates:
   - **Tileset 1:** Date: 2024-11-01, Time: 10:30
   - **Tileset 2:** Date: 2024-11-03, Time: 14:30

---

## Step 4: Test the Map Component

### Where to View the Map

Find where you're using `MapboxGolfCourseMap` in your app. It should be something like:

```tsx
<MapboxGolfCourseMap
  golfClubId="your-golf-club-id"
  mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
/>
```

### What You Should See

1. **Map loads** with the most recent tileset
2. **"Layers" button** in top-left showing count (e.g., "Layers (2)")
3. **Click "Layers"** → LayerSelector panel appears below map
4. **See your tilesets** listed with dates and times
5. **Toggle switches** to enable/disable layers

### Test Layer Selection

1. **Enable 2 layers** using the toggle switches
2. **"Swipe Compare" button** should appear
3. **Click "Swipe Compare"**
4. **Drag the slider** to compare the two layers side-by-side

---

## Step 5: Verify It's Working

### ✅ Checklist

- [ ] Database migration ran successfully
- [ ] At least 2 tilesets exist for the same golf course
- [ ] Tilesets have different `flight_date` values
- [ ] Map component loads without errors
- [ ] Layer selector shows all tilesets
- [ ] Can toggle layers on/off
- [ ] Swipe button appears when 2 layers selected
- [ ] Swipe slider is draggable
- [ ] Layers switch as you drag the slider

---

## Troubleshooting

### Issue: "No tilesets found"
**Solution:** Run Step 2 to check if tilesets exist. Create test data using Step 3.

### Issue: Layers button shows "Layers (0)"
**Solution:** Check `golf_club_id` matches between your map component and database records.

### Issue: Swipe button doesn't appear
**Solution:** Make sure exactly 2 layers are selected (toggle switches on).

### Issue: Tiles don't load
**Solution:** This is expected if tiles aren't in R2 yet. The layer selector and swipe UI should still work.

### Issue: TypeScript errors
**Solution:** Run `npm install` to ensure all dependencies are installed.

---

## Quick Test SQL

**Run this to see your test data:**

```sql
SELECT 
  name,
  flight_date,
  flight_time,
  flight_datetime,
  r2_folder_path,
  is_active
FROM golf_course_tilesets
WHERE golf_club_id = 'YOUR_GOLF_CLUB_ID' -- Replace with your ID
ORDER BY flight_datetime DESC;
```

---

## Next Steps After Testing

Once layer selection and swipe work:

1. **Fix tile upload** to use new date/time structure
2. **Upload real tiles** to R2 with correct paths
3. **Create more tilesets** from different flight dates
4. **Compare actual imagery** between dates

---

**Ready to start?** 

1. Run the migration SQL in Supabase
2. Let me know what you see when you check your existing tilesets
3. We'll create test data and test the UI!
