-- Temporarily disable RLS on health_map_tilesets to test
ALTER TABLE health_map_tilesets DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS enabled but make it permissive for testing:
-- DROP POLICY IF EXISTS "Users can view health maps for their assigned golf clubs" ON health_map_tilesets;
-- DROP POLICY IF EXISTS "Admins can manage all health maps" ON health_map_tilesets;

-- CREATE POLICY "Allow all authenticated users to view health maps (TEMPORARY)"
--   ON health_map_tilesets
--   FOR SELECT
--   USING (auth.uid() IS NOT NULL);

-- CREATE POLICY "Admins can manage all health maps"
--   ON health_map_tilesets
--   FOR ALL
--   USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE users.id = auth.uid() 
--       AND users.role = 'admin'
--     )
--   );
