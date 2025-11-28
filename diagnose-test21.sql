-- Diagnostic queries for test21 tile loading issue

-- 1. Compare test20 and test21 metadata
SELECT 
  name,
  id,
  golf_club_id,
  r2_folder_path,
  tile_url_pattern,
  flight_date,
  flight_time,
  flight_datetime,
  min_zoom,
  max_zoom,
  min_lat,
  max_lat,
  min_lon,
  max_lon,
  is_active,
  created_at
FROM golf_course_tilesets
WHERE name IN ('test20', 'test21')
ORDER BY name;

-- 2. Check if client has access to both golf clubs
SELECT 
  u.email,
  u.role,
  gcc.golf_club_id,
  gc.name as club_name,
  gct.name as tileset_name,
  gct.r2_folder_path,
  gcc.assigned_at
FROM users u
JOIN client_golf_courses gcc ON u.id = gcc.client_id
JOIN golf_clubs gc ON gcc.golf_club_id = gc.id
LEFT JOIN golf_course_tilesets gct ON gc.id = gct.golf_club_id
WHERE gct.name IN ('test20', 'test21')
ORDER BY gct.name;

-- 3. Check RLS policies on golf_course_tilesets
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'golf_course_tilesets';

-- 4. Verify golf_clubs for test20 and test21
SELECT 
  gc.id,
  gc.name,
  gct.name as tileset_name,
  gct.r2_folder_path
FROM golf_clubs gc
LEFT JOIN golf_course_tilesets gct ON gc.id = gct.golf_club_id
WHERE gct.name IN ('test20', 'test21')
ORDER BY gct.name;

-- 5. Check if there are multiple tilesets with same name
SELECT 
  name,
  COUNT(*) as count,
  array_agg(id) as tileset_ids,
  array_agg(r2_folder_path) as paths
FROM golf_course_tilesets
WHERE name IN ('test20', 'test21')
GROUP BY name;

-- POSSIBLE FIX 1: If r2_folder_path is wrong, update it
-- Uncomment and run if tiles are actually at a different path:
/*
UPDATE golf_course_tilesets 
SET r2_folder_path = 'test21/tiles'  -- Change to actual path
WHERE id = '89713b44-b261-48c8-bd72-2542a1339239';
*/

-- POSSIBLE FIX 2: If bounds are wrong, copy from test20
-- Uncomment and run if bounds need to be updated:
/*
UPDATE golf_course_tilesets t21
SET 
  min_lat = t20.min_lat,
  max_lat = t20.max_lat,
  min_lon = t20.min_lon,
  max_lon = t20.max_lon,
  center_lat = t20.center_lat,
  center_lon = t20.center_lon
FROM golf_course_tilesets t20
WHERE t21.name = 'test21'
  AND t20.name = 'test20';
*/

-- POSSIBLE FIX 3: If tileset is inactive, activate it
-- Uncomment and run if needed:
/*
UPDATE golf_course_tilesets 
SET is_active = true
WHERE name = 'test21';
*/

-- 6. Test tile path construction
-- This shows what the actual tile path will be for zoom 15, x=16774, y=10893
SELECT 
  name,
  r2_folder_path || '/' || 
    replace(replace(replace(tile_url_pattern, '{z}', '15'), '{x}', '16774'), '{y}', '10893') 
    as sample_tile_path
FROM golf_course_tilesets
WHERE name IN ('test20', 'test21');

-- Expected output for test21:
-- test21/2025-11-24/17-30/tiles/15/16774/10893.png

-- 7. Check if there are any error logs (if you have a logs table)
-- Uncomment if applicable:
/*
SELECT * FROM logs 
WHERE message LIKE '%test21%' 
ORDER BY created_at DESC 
LIMIT 20;
*/
