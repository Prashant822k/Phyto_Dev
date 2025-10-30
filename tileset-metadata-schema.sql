-- Tileset metadata table for storing XYZ tile information per golf course
CREATE TABLE IF NOT EXISTS public.golf_course_tilesets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  golf_club_id UUID NOT NULL REFERENCES public.golf_clubs(id) ON DELETE CASCADE,
  
  -- Tileset name and description
  name TEXT NOT NULL,
  description TEXT,
  
  -- Geographic bounds
  min_lat DOUBLE PRECISION NOT NULL,
  max_lat DOUBLE PRECISION NOT NULL,
  min_lon DOUBLE PRECISION NOT NULL,
  max_lon DOUBLE PRECISION NOT NULL,
  
  -- Center point for initial map view
  center_lat DOUBLE PRECISION NOT NULL,
  center_lon DOUBLE PRECISION NOT NULL,
  
  -- Zoom configuration
  min_zoom INTEGER NOT NULL DEFAULT 12,
  max_zoom INTEGER NOT NULL DEFAULT 20,
  default_zoom INTEGER NOT NULL DEFAULT 16,
  
  -- R2 storage configuration
  r2_folder_path TEXT NOT NULL, -- e.g., "pine-valley-golf-club/tiles"
  tile_url_pattern TEXT NOT NULL, -- e.g., "{z}/{x}/{y}.png"
  
  -- Tile format and properties
  tile_size INTEGER DEFAULT 256, -- 256 or 512
  format TEXT DEFAULT 'png' CHECK (format IN ('png', 'jpg', 'webp')),
  
  -- Attribution and metadata
  attribution TEXT,
  metadata JSONB,
  
  -- Status and visibility
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one active tileset per golf course
  UNIQUE(golf_club_id, name)
);

-- Enable RLS
ALTER TABLE public.golf_course_tilesets ENABLE ROW LEVEL SECURITY;

-- Admins can manage all tilesets
CREATE POLICY "Admins can manage tilesets" ON public.golf_course_tilesets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Clients can view tilesets for their club
CREATE POLICY "Clients can view their club's tilesets" ON public.golf_course_tilesets
  FOR SELECT USING (
    golf_club_id = public.current_user_club_id()
  );

-- Index for performance
CREATE INDEX idx_tilesets_golf_club ON public.golf_course_tilesets(golf_club_id);
CREATE INDEX idx_tilesets_active ON public.golf_course_tilesets(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_tilesets_updated_at BEFORE UPDATE ON public.golf_course_tilesets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Example: Insert sample tileset for a golf course
COMMENT ON TABLE public.golf_course_tilesets IS 'Stores metadata for XYZ tile overlays for golf courses';

-- Example insert (adjust values for your actual golf course)
-- INSERT INTO public.golf_course_tilesets (
--   golf_club_id,
--   name,
--   description,
--   min_lat, max_lat, min_lon, max_lon,
--   center_lat, center_lon,
--   min_zoom, max_zoom, default_zoom,
--   r2_folder_path,
--   tile_url_pattern,
--   attribution
-- ) VALUES (
--   (SELECT id FROM public.golf_clubs WHERE name = 'Pine Valley Golf Club'),
--   'Main Course Overlay',
--   'High-resolution satellite imagery of the main 18-hole course',
--   39.980, 39.995, -74.965, -74.945,  -- Bounds (example coordinates)
--   39.9875, -74.955,  -- Center
--   14, 20, 17,  -- Zoom levels
--   'pine-valley-golf-club/tiles',
--   '{z}/{x}/{y}.png',
--   'Imagery © Pine Valley Golf Club'
-- );

