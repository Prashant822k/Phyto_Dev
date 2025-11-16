-- Debug query to check if tileset lookup is working correctly

-- 1. Check your tileset data
SELECT 
  id, 
  name, 
  r2_folder_path, 
  tile_url_pattern,
  golf_club_id,
  flight_date, 
  flight_time,
  is_active
FROM golf_course_tilesets 
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';

-- 2. Test the exact query that r2-sign function uses
-- This simulates what happens when getTile tries to find the tileset
SELECT golf_club_id
FROM golf_course_tilesets
WHERE r2_folder_path = 'test20/2025-11-05/09-30/tiles';

-- Expected: Should return one row with golf_club_id
-- If empty: The r2_folder_path doesn't match

-- 3. Check if there are similar paths (in case of typo)
SELECT 
  id,
  name,
  r2_folder_path,
  LENGTH(r2_folder_path) as path_length
FROM golf_course_tilesets
WHERE r2_folder_path LIKE '%test20%';

-- 4. Check for hidden characters or spaces
SELECT 
  id,
  name,
  r2_folder_path,
  LENGTH(r2_folder_path) as length,
  LENGTH(TRIM(r2_folder_path)) as trimmed_length,
  r2_folder_path = 'test20/2025-11-05/09-30/tiles' as exact_match
FROM golf_course_tilesets 
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';
