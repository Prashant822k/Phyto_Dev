-- =====================================================
-- MULTI-COURSE CLIENT ASSIGNMENT - DEPLOYMENT GUIDE
-- =====================================================
-- This file contains the complete SQL migration to enable
-- one-to-many client-to-course relationships.
-- 
-- DEPLOYMENT STEPS:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Deploy the edge function: supabase functions deploy manage-client-courses
-- 3. Restart your frontend application
-- =====================================================

-- Execute the main migration
\i multi-course-client-assignment.sql

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('client_golf_courses', 'golf_clubs');

-- Verify client_id column was added to golf_clubs
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'golf_clubs' 
  AND column_name = 'client_id';

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('client_golf_courses', 'golf_clubs', 'golf_course_tilesets')
ORDER BY tablename, policyname;

-- Verify functions were created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_client_golf_courses',
    'client_has_course_access',
    'assign_client_to_course',
    'remove_client_from_course'
  );

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Example: Create test golf courses
DO $$
DECLARE
  course1_id UUID;
  course2_id UUID;
  course3_id UUID;
BEGIN
  -- Insert test courses
  INSERT INTO public.golf_clubs (name) 
  VALUES ('Pine Valley Golf Club') 
  RETURNING id INTO course1_id;
  
  INSERT INTO public.golf_clubs (name) 
  VALUES ('Augusta National Golf Club') 
  RETURNING id INTO course2_id;
  
  INSERT INTO public.golf_clubs (name) 
  VALUES ('St Andrews Links') 
  RETURNING id INTO course3_id;
  
  RAISE NOTICE 'Created test courses: %, %, %', course1_id, course2_id, course3_id;
END $$;

-- Example: Assign a client to multiple courses
-- Replace 'client@example.com' with an actual client email
DO $$
DECLARE
  client_user_id UUID;
  admin_user_id UUID;
BEGIN
  -- Get client user ID
  SELECT id INTO client_user_id 
  FROM public.users 
  WHERE email = 'client@example.com' 
    AND role = 'client' 
  LIMIT 1;
  
  -- Get admin user ID (for assigned_by)
  SELECT id INTO admin_user_id 
  FROM public.users 
  WHERE role = 'admin' 
  LIMIT 1;
  
  IF client_user_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
    -- Assign client to multiple courses
    PERFORM public.assign_client_to_course(
      client_user_id,
      gc.id,
      admin_user_id
    )
    FROM public.golf_clubs gc
    WHERE gc.name IN ('Pine Valley Golf Club', 'Augusta National Golf Club');
    
    RAISE NOTICE 'Assigned client % to multiple courses', client_user_id;
  ELSE
    RAISE NOTICE 'Client or admin user not found';
  END IF;
END $$;

-- =====================================================
-- USEFUL QUERIES FOR ADMINISTRATION
-- =====================================================

-- View all client-course assignments
SELECT 
  u.email as client_email,
  u.full_name as client_name,
  gc.name as golf_course,
  cgc.assigned_at,
  cgc.is_active
FROM public.client_golf_courses cgc
JOIN public.users u ON cgc.client_id = u.id
JOIN public.golf_clubs gc ON cgc.golf_club_id = gc.id
ORDER BY u.email, cgc.assigned_at DESC;

-- Count courses per client
SELECT 
  u.email,
  u.full_name,
  COUNT(cgc.id) as course_count
FROM public.users u
LEFT JOIN public.client_golf_courses cgc ON u.id = cgc.client_id AND cgc.is_active = true
WHERE u.role = 'client'
GROUP BY u.id, u.email, u.full_name
ORDER BY course_count DESC, u.email;

-- Count clients per course
SELECT 
  gc.name as golf_course,
  COUNT(cgc.id) as client_count
FROM public.golf_clubs gc
LEFT JOIN public.client_golf_courses cgc ON gc.id = cgc.golf_club_id AND cgc.is_active = true
GROUP BY gc.id, gc.name
ORDER BY client_count DESC, gc.name;

-- Find clients with no course assignments
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.created_at
FROM public.users u
LEFT JOIN public.client_golf_courses cgc ON u.id = cgc.client_id AND cgc.is_active = true
WHERE u.role = 'client' 
  AND cgc.id IS NULL
ORDER BY u.created_at DESC;

-- =====================================================
-- ROLLBACK SCRIPT (USE WITH CAUTION)
-- =====================================================
-- Uncomment and run if you need to rollback changes

/*
-- Drop new policies
DROP POLICY IF EXISTS "Clients can read assigned clubs" ON public.golf_clubs;
DROP POLICY IF EXISTS "Clients can view assigned course tilesets" ON public.golf_course_tilesets;
DROP POLICY IF EXISTS "Images select by assigned courses or admin" ON public.images;
DROP POLICY IF EXISTS "Admins can manage client course assignments" ON public.client_golf_courses;
DROP POLICY IF EXISTS "Clients can view their own course assignments" ON public.client_golf_courses;

-- Drop functions
DROP FUNCTION IF EXISTS public.get_client_golf_courses(UUID);
DROP FUNCTION IF EXISTS public.client_has_course_access(UUID, UUID);
DROP FUNCTION IF EXISTS public.assign_client_to_course(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.remove_client_from_course(UUID, UUID);
DROP FUNCTION IF EXISTS public.sync_club_id_to_assignments();

-- Drop trigger
DROP TRIGGER IF EXISTS sync_club_id_trigger ON public.users;

-- Drop table
DROP TABLE IF EXISTS public.client_golf_courses;

-- Remove client_id column from golf_clubs
ALTER TABLE public.golf_clubs DROP COLUMN IF EXISTS client_id;

-- Recreate old policies
CREATE POLICY "Clients can read clubs" ON public.golf_clubs
  FOR SELECT USING (true);

CREATE POLICY "Clients can view their club's tilesets" ON public.golf_course_tilesets
  FOR SELECT USING (golf_club_id = public.current_user_club_id());
*/
