-- Fix r2_folder_path to match actual R2 bucket structure
-- Your tiles are at: map-stats-tiles-prod/test20/2025-11-05/09-30/tiles/
-- But database has: test20/2025-11-05/09-30/tiles

-- Check current value
SELECT id, name, r2_folder_path, flight_date, flight_time 
FROM golf_course_tilesets 
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';

-- Option 1: If tiles ARE at map-stats-tiles-prod/test20/... in R2
-- UPDATE golf_course_tilesets 
-- SET r2_folder_path = 'map-stats-tiles-prod/test20/2025-11-05/09-30/tiles'
-- WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';

-- Option 2: If tiles should be at test20/... (without bucket prefix)
-- Then you need to re-upload tiles to the correct path in R2
-- The r2_folder_path is already correct: test20/2025-11-05/09-30/tiles

-- After fixing, verify:
-- SELECT id, name, r2_folder_path FROM golf_course_tilesets WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';
