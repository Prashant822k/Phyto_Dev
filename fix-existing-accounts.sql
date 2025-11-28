-- =====================================================
-- FIX EXISTING ACCOUNTS AFTER MULTI-COURSE MIGRATION
-- =====================================================
-- This script restores access for existing admin and client accounts
-- Run this AFTER running multi-course-client-assignment.sql

-- Step 1: Verify existing users
-- =====================================================
SELECT 
  id, 
  email, 
  role, 
  club_id,
  created_at
FROM public.users
ORDER BY role, email;

-- Step 2: Migrate existing client club_id to client_golf_courses
-- =====================================================
-- This ensures all existing clients with club_id can still access their courses
INSERT INTO public.client_golf_courses (client_id, golf_club_id, is_active)
SELECT 
  u.id as client_id,
  u.club_id as golf_club_id,
  true as is_active
FROM public.users u
WHERE u.club_id IS NOT NULL 
  AND u.role = 'client'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.client_golf_courses cgc 
    WHERE cgc.client_id = u.id 
      AND cgc.golf_club_id = u.club_id
  )
ON CONFLICT (client_id, golf_club_id) DO NOTHING;

-- Step 3: Verify the migration worked
-- =====================================================
SELECT 
  u.email,
  u.role,
  u.club_id as original_club_id,
  COUNT(cgc.id) as assigned_courses
FROM public.users u
LEFT JOIN public.client_golf_courses cgc ON u.id = cgc.client_id AND cgc.is_active = true
WHERE u.role = 'client'
GROUP BY u.id, u.email, u.role, u.club_id
ORDER BY u.email;

-- Step 4: Check RLS policies are correct
-- =====================================================
-- Verify users table policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 5: Ensure admin users can still access everything
-- =====================================================
-- Check if admin role check function exists
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'is_admin';

-- Step 6: Test admin access
-- =====================================================
-- This should return true for admin users
SELECT 
  u.email,
  u.role,
  public.is_admin() as has_admin_access
FROM public.users u
WHERE u.role = 'admin';

-- Step 7: Verify golf_clubs access
-- =====================================================
-- Check golf_clubs RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'golf_clubs'
ORDER BY policyname;

-- Step 8: Grant necessary permissions (if missing)
-- =====================================================
-- Ensure authenticated users can read their own data
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT ON public.golf_clubs TO authenticated;
GRANT SELECT ON public.client_golf_courses TO authenticated;

-- Step 9: Recreate missing policies if needed
-- =====================================================
-- Drop and recreate users policies to ensure they're correct
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Users can insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (public.is_admin());

-- Step 10: Verify authentication works
-- =====================================================
-- Check auth.users table
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  u.role,
  u.club_id
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
ORDER BY au.email;

-- Step 11: Find users in auth.users but not in public.users
-- =====================================================
-- These users might need profile creation
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- Step 12: Create missing user profiles (if any)
-- =====================================================
-- This creates profiles for auth users that don't have one
INSERT INTO public.users (id, email, role)
SELECT 
  au.id,
  au.email,
  'client' as role
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 13: Final verification
-- =====================================================
-- Show all users with their access status
SELECT 
  u.id,
  u.email,
  u.role,
  u.club_id,
  COUNT(cgc.id) as assigned_courses,
  CASE 
    WHEN u.role = 'admin' THEN 'Full Access'
    WHEN u.role = 'client' AND COUNT(cgc.id) > 0 THEN 'Has Courses'
    WHEN u.role = 'client' AND COUNT(cgc.id) = 0 AND u.club_id IS NOT NULL THEN 'Migration Needed'
    WHEN u.role = 'client' AND COUNT(cgc.id) = 0 AND u.club_id IS NULL THEN 'No Courses'
    ELSE 'Unknown'
  END as access_status
FROM public.users u
LEFT JOIN public.client_golf_courses cgc ON u.id = cgc.client_id AND cgc.is_active = true
GROUP BY u.id, u.email, u.role, u.club_id
ORDER BY u.role, u.email;

-- =====================================================
-- TROUBLESHOOTING QUERIES
-- =====================================================

-- If admin still can't login, check if is_admin() function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'is_admin' AND routine_schema = 'public'
  ) THEN
    -- Recreate is_admin function
    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS BOOLEAN AS $func$
      SELECT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
      );
    $func$ LANGUAGE sql STABLE SECURITY DEFINER;
    
    RAISE NOTICE 'Recreated is_admin() function';
  ELSE
    RAISE NOTICE 'is_admin() function already exists';
  END IF;
END $$;

-- If current_user_club_id() is missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'current_user_club_id' AND routine_schema = 'public'
  ) THEN
    -- Recreate current_user_club_id function
    CREATE OR REPLACE FUNCTION public.current_user_club_id()
    RETURNS UUID AS $func$
      SELECT club_id FROM public.users WHERE id = auth.uid();
    $func$ LANGUAGE sql STABLE SECURITY DEFINER;
    
    RAISE NOTICE 'Recreated current_user_club_id() function';
  ELSE
    RAISE NOTICE 'current_user_club_id() function already exists';
  END IF;
END $$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_club_id() TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Account fix script completed!';
  RAISE NOTICE 'Please verify:';
  RAISE NOTICE '1. Admin users can login';
  RAISE NOTICE '2. Client users can login';
  RAISE NOTICE '3. Clients can see their assigned courses';
  RAISE NOTICE 'Check the final verification query above for access status.';
END $$;
