-- Revert test21 back to without bucket prefix (to match test20)
UPDATE golf_course_tilesets 
SET r2_folder_path = 'test21/2025-11-24/17-30/tiles'
WHERE id = '89713b44-b261-48c8-bd72-2542a1339239';

-- Verify both are now in same format
SELECT name, r2_folder_path 
FROM golf_course_tilesets 
WHERE name IN ('test20', 'test21')
ORDER BY name;

-- Check ALL fields to find differences
SELECT 
  name,
  id,
  golf_club_id,
  r2_folder_path,
  tile_url_pattern,
  tile_size,
  format,
  min_zoom,
  max_zoom,
  min_lat,
  max_lat,
  min_lon,
  max_lon,
  center_lat,
  center_lon,
  default_zoom,
  is_active,
  attribution
FROM golf_course_tilesets
WHERE name IN ('test20', 'test21')
ORDER BY name;
