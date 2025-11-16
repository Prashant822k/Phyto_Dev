-- Update the r2_folder_path to match your actual R2 bucket structure
-- Current: test20/2025-11-05/09-30/tiles
-- Actual R2: map-stats-tiles-prod/test20/2025-11-05/09-30/tiles/

-- First, check the current value
SELECT 
  id, 
  name, 
  r2_folder_path, 
  tile_url_pattern,
  flight_date, 
  flight_time 
FROM golf_course_tilesets 
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';

-- Update to include the bucket prefix
UPDATE golf_course_tilesets 
SET r2_folder_path = 'map-stats-tiles-prod/test20/2025-11-05/09-30/tiles'
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';

-- Verify the update
SELECT 
  id, 
  name, 
  r2_folder_path, 
  tile_url_pattern,
  flight_date, 
  flight_time 
FROM golf_course_tilesets 
WHERE id = 'a0bb4617-bfa1-4dc8-bce9-34053b5fb00d';

-- After running this, test the map again in your browser
