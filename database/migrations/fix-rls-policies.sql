-- Fix RLS Policies for golf_course_tilesets
-- Run this in Supabase SQL Editor

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'golf_course_tilesets';

-- Check existing policies
SELECT * FROM pg_policies 
WHERE tablename = 'golf_course_tilesets';

-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Users can view tilesets for their golf club" ON golf_course_tilesets;
DROP POLICY IF EXISTS "Admins can manage all tilesets" ON golf_course_tilesets;

-- Create new policies that work for both admin and client users

-- 1. Allow authenticated users to read tilesets for their assigned club
CREATE POLICY "Users can view tilesets for their club"
ON golf_course_tilesets
FOR SELECT
TO authenticated
USING (
  golf_club_id IN (
    SELECT club_id FROM users WHERE id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 2. Allow admins to insert tilesets
CREATE POLICY "Admins can insert tilesets"
ON golf_course_tilesets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Allow admins to update tilesets
CREATE POLICY "Admins can update tilesets"
ON golf_course_tilesets
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Allow admins to delete tilesets
CREATE POLICY "Admins can delete tilesets"
ON golf_course_tilesets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Verify the new policies
SELECT * FROM pg_policies WHERE tablename = 'golf_course_tilesets';

-- Test query as the current user
SELECT 
  gct.*,
  gc.name as golf_club_name
FROM golf_course_tilesets gct
JOIN golf_clubs gc ON gct.golf_club_id = gc.id
WHERE gct.golf_club_id = '94bb4113-eb8f-4bad-a0d3-68969f462ae6'
AND gct.is_active = true;
