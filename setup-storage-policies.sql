-- This script sets up the proper RLS policies for the raw-images bucket in Supabase Storage
-- Run this in the Supabase SQL Editor to fix authentication issues

-- First, let's drop any existing policies for the raw-images bucket to start fresh
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow individual write access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;

-- Now, let's create the policies we need

-- 1. Allow anyone to read from the raw-images bucket (public read access)
CREATE POLICY "Allow public read access for raw-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'raw-images');

-- 2. Allow authenticated users to upload to the raw-images bucket
CREATE POLICY "Allow authenticated uploads to raw-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'raw-images');

-- 3. Allow authenticated users to update their own objects
CREATE POLICY "Allow authenticated updates to raw-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'raw-images' AND (auth.uid() = owner OR auth.uid() IN (SELECT id FROM auth.users WHERE email = 'demo@phytomaps.com')))
WITH CHECK (bucket_id = 'raw-images');

-- 4. Allow authenticated users to delete their own objects
CREATE POLICY "Allow authenticated deletes from raw-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'raw-images' AND (auth.uid() = owner OR auth.uid() IN (SELECT id FROM auth.users WHERE email = 'demo@phytomaps.com')));

-- Special policy to ensure the demo user can access all files (for development)
CREATE POLICY "Allow demo user full access"
ON storage.objects
TO authenticated
USING (
  auth.uid() IN (SELECT id FROM auth.users WHERE email = 'demo@phytomaps.com')
);