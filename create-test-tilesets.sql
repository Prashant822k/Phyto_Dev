-- Create Test Tilesets for Layer Selection Testing
-- This script creates 2 duplicate tilesets with different dates for testing

-- STEP 1: Find your existing tileset
-- Run this first to get your tileset ID:
SELECT 
  id,
  golf_club_id,
  name,
  r2_folder_path,
  created_at
FROM golf_course_tilesets
ORDER BY created_at DESC
LIMIT 1;

-- STEP 2: Copy the ID from above and replace 'YOUR_TILESET_ID' below

-- Create first test tileset (November 1st, 2024)
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
  metadata,
  is_active,
  flight_date,
  flight_time
)
SELECT 
  golf_club_id,
  name,
  'Test Flight - November 1st Morning' as description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path, -- Using same R2 path for testing (will show same tiles)
  tile_url_pattern,
  tile_size,
  format,
  attribution,
  metadata,
  true as is_active,
  '2024-11-01'::date as flight_date,
  '10:30:00'::time as flight_time
FROM golf_course_tilesets
WHERE id = 'YOUR_TILESET_ID'; -- ⚠️ REPLACE THIS WITH YOUR ACTUAL TILESET ID

-- Create second test tileset (November 3rd, 2024)
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
  metadata,
  is_active,
  flight_date,
  flight_time
)
SELECT 
  golf_club_id,
  name,
  'Test Flight - November 3rd Afternoon' as description,
  min_lat, max_lat, min_lon, max_lon,
  center_lat, center_lon,
  min_zoom, max_zoom, default_zoom,
  r2_folder_path, -- Using same R2 path for testing
  tile_url_pattern,
  tile_size,
  format,
  attribution,
  metadata,
  true as is_active,
  '2024-11-03'::date as flight_date,
  '14:30:00'::time as flight_time
FROM golf_course_tilesets
WHERE id = 'YOUR_TILESET_ID'; -- ⚠️ REPLACE THIS WITH YOUR ACTUAL TILESET ID

-- STEP 3: Verify the test tilesets were created
SELECT 
  id,
  name,
  description,
  flight_date,
  flight_time,
  flight_datetime,
  r2_folder_path,
  is_active
FROM golf_course_tilesets
WHERE golf_club_id = (
  SELECT golf_club_id 
  FROM golf_course_tilesets 
  WHERE id = 'YOUR_TILESET_ID' -- ⚠️ REPLACE THIS
)
ORDER BY flight_datetime DESC;

-- Expected result: You should see 3 tilesets total
-- 1. Original tileset (no date/time)
-- 2. November 1st tileset
-- 3. November 3rd tileset
