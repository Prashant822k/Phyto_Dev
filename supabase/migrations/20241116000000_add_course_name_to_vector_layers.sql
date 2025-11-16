-- Add course_name column to vector_layers table
-- This stores the course identifier (e.g., "test20") for the R2 path structure:
-- map-stats-tiles-prod/{course_name}/Vector_Layers/{layer_name}.geojson

ALTER TABLE public.vector_layers
ADD COLUMN IF NOT EXISTS course_name text;

-- Add comment to explain the column
COMMENT ON COLUMN public.vector_layers.course_name IS 'Course identifier used in R2 path structure (e.g., test20 for test20/Vector_Layers/)';

-- Create index for faster lookups by course_name
CREATE INDEX IF NOT EXISTS idx_vector_layers_course_name ON public.vector_layers(course_name);

-- Create composite index for golf_club_id + course_name
CREATE INDEX IF NOT EXISTS idx_vector_layers_club_course ON public.vector_layers(golf_club_id, course_name);
