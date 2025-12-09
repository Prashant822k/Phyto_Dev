-- Drop existing policies
DROP POLICY IF EXISTS "Users can view health maps for their assigned golf clubs" ON health_map_tilesets;
DROP POLICY IF EXISTS "Admins can manage all health maps" ON health_map_tilesets;

-- Create simpler RLS policies without recursion
CREATE POLICY "Users can view health maps for their assigned golf clubs"
  ON health_map_tilesets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_golf_courses cgc 
      WHERE cgc.golf_club_id::TEXT = health_map_tilesets.golf_club_id
      AND cgc.client_id = auth.uid()
      AND cgc.is_active = true
    )
  );

CREATE POLICY "Admins can manage all health maps"
  ON health_map_tilesets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
