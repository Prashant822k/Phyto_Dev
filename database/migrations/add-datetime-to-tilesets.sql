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
