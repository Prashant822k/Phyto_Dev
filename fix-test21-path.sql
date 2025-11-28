-- Fix test21 R2 path to include bucket prefix

-- Current path in database: test21/2025-11-24/17-30/tiles
-- Actual path in R2: map-stats-tiles-prod/test21/2025-11-24/17-30/tiles

-- Update test21 path
UPDATE golf_course_tilesets 
SET r2_folder_path = 'map-stats-tiles-prod/test21/2025-11-24/17-30/tiles'
WHERE id = '89713b44-b261-48c8-bd72-2542a1339239';

-- Verify the update
SELECT 
  name,
  r2_folder_path,
  r2_folder_path || '/' || 
    replace(replace(replace(tile_url_pattern, '{z}', '15'), '{x}', '16774'), '{y}', '10893') 
    as sample_tile_path
FROM golf_course_tilesets
WHERE name = 'test21';

-- Expected output:
-- name: test21
-- r2_folder_path: map-stats-tiles-prod/test21/2025-11-24/17-30/tiles
-- sample_tile_path: map-stats-tiles-prod/test21/2025-11-24/17-30/tiles/15/16774/10893.png

-- IMPORTANT: Check if test20 also needs the bucket prefix
SELECT 
  name,
  r2_folder_path,
  r2_folder_path || '/' || 
    replace(replace(replace(tile_url_pattern, '{z}', '15'), '{x}', '16774'), '{y}', '10893') 
    as sample_tile_path
FROM golf_course_tilesets
WHERE name = 'test20';

-- If test20 is working, it might already have the bucket prefix
-- Or your R2 configuration might be different for test20

-- If test20 also needs updating:
/*
UPDATE golf_course_tilesets 
SET r2_folder_path = 'map-stats-tiles-prod/test20/2025-11-05/09-30/tiles'
WHERE name = 'test20';
*/
