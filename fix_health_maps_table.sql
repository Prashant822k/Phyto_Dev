-- Create health_map_tilesets table
CREATE TABLE IF NOT EXISTS health_map_tilesets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  golf_club_id TEXT NOT NULL,
  source_tileset_id UUID REFERENCES golf_course_tilesets(id) ON DELETE CASCADE,
  
  -- Health map paths
  r2_folder_path TEXT NOT NULL,
  tile_url_pattern TEXT DEFAULT '{z}/{x}/{y}.png',
  
  -- Analysis metadata
  analysis_type TEXT DEFAULT 'ndvi',
  analysis_date DATE NOT NULL,
  analysis_time TIME NOT NULL,
  
  -- Metadata copied from source tileset (same bounds, center, zoom)
  min_lat DOUBLE PRECISION NOT NULL,
  max_lat DOUBLE PRECISION NOT NULL,
  min_lon DOUBLE PRECISION NOT NULL,
  max_lon DOUBLE PRECISION NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lon DOUBLE PRECISION NOT NULL,
  min_zoom INTEGER DEFAULT 14,
  max_zoom INTEGER DEFAULT 20,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_maps_golf_club ON health_map_tilesets(golf_club_id);
CREATE INDEX IF NOT EXISTS idx_health_maps_source ON health_map_tilesets(source_tileset_id);
CREATE INDEX IF NOT EXISTS idx_health_maps_active ON health_map_tilesets(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE health_map_tilesets ENABLE ROW LEVEL SECURITY;

-- RLS Policies (FIXED: Cast UUID to TEXT for comparison)
DROP POLICY IF EXISTS "Users can view health maps for their assigned golf clubs" ON health_map_tilesets;
CREATE POLICY "Users can view health maps for their assigned golf clubs"
  ON health_map_tilesets
  FOR SELECT
  USING (
    golf_club_id IN (
      SELECT cgc.golf_club_id::TEXT
      FROM client_golf_courses cgc 
      WHERE cgc.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage all health maps" ON health_map_tilesets;
CREATE POLICY "Admins can manage all health maps"
  ON health_map_tilesets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

COMMENT ON TABLE health_map_tilesets IS 'Stores health analysis map tiles (NDVI, stress, etc.) with separate date/time from source tiles';
