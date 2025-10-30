-- Simple Fix for RLS Stack Depth Issue
-- Run this in Supabase SQL Editor

-- STEP 1: Temporarily disable RLS to test
ALTER TABLE golf_course_tilesets DISABLE ROW LEVEL SECURITY;

-- STEP 2: Test if query works now
SELECT 
  gct.*,
  gc.name as golf_club_name
FROM golf_course_tilesets gct
JOIN golf_clubs gc ON gct.golf_club_id = gc.id
WHERE gct.is_active = true;

-- If the above works, the issue is RLS policies
-- Let's create simple, non-recursive policies

-- STEP 3: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view tilesets for their golf club" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can manage all tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Users can view tilesets for their club" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can insert tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can update tilesets" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can delete tilesets" ON golf_course_tilesets;

-- STEP 4: Re-enable RLS
ALTER TABLE golf_course_tilesets ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create SIMPLE policies without subqueries

-- Allow all authenticated users to READ tilesets
-- (We'll filter by club_id in the application layer)
CREATE POLICY "Allow authenticated users to read tilesets"
ON golf_course_tilesets
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to INSERT
CREATE POLICY "Allow admins to insert tilesets"
ON golf_course_tilesets
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Allow admins to UPDATE
CREATE POLICY "Allow admins to update tilesets"
ON golf_course_tilesets
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Allow admins to DELETE
CREATE POLICY "Allow admins to delete tilesets"
ON golf_course_tilesets
FOR DELETE
TO authenticated
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- STEP 6: Verify policies
SELECT * FROM pg_policies WHERE tablename = 'golf_course_tilesets';

-- STEP 7: Test query again
SELECT 
  gct.*,
  gc.name as golf_club_name
FROM golf_course_tilesets gct
JOIN golf_clubs gc ON gct.golf_club_id = gc.id
WHERE gct.is_active = true;
