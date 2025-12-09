-- Add bucket prefix to BOTH test20 and test21
-- Since your R2 files are actually at: map-stats-tiles-prod/test21/...

UPDATE golf_course_tilesets 
SET r2_folder_path = 'map-stats-tiles-prod/test20/2025-11-05/09-30/tiles'
WHERE name = 'test20';

UPDATE golf_course_tilesets 
SET r2_folder_path = 'map-stats-tiles-prod/test21/2025-11-24/17-30/tiles'
WHERE name = 'test21';

-- Verify both are updated
SELECT 
  name,
  r2_folder_path,
  r2_folder_path || '/' || 
    replace(replace(replace(tile_url_pattern, '{z}', '15'), '{x}', '16774'), '{y}', '10893') 
    as sample_tile_path
FROM golf_course_tilesets
WHERE name IN ('test20', 'test21')
ORDER BY name;

-- Expected output:
-- test20: map-stats-tiles-prod/test20/2025-11-05/09-30/tiles/15/16774/10893.png
-- test21: map-stats-tiles-prod/test21/2025-11-24/17-30/tiles/15/16774/10893.png
