-- =====================================================
-- Fix: Sync users.club_id with client_golf_courses
-- =====================================================
-- This migration updates the assignment functions to keep
-- users.club_id in sync with client_golf_courses for backward compatibility.
--
-- The users.club_id will store the FIRST/PRIMARY assigned course.
-- For multi-course access, client_golf_courses is the source of truth.

-- Step 1: Update assign_client_to_course to also update users.club_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.assign_client_to_course(
  p_client_id UUID,
  p_golf_club_id UUID,
  p_assigned_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
  v_client_role TEXT;
  v_current_club_id UUID;
BEGIN
  -- Verify the user is a client
  SELECT role, club_id INTO v_client_role, v_current_club_id
  FROM public.users 
  WHERE id = p_client_id;
  
  IF v_client_role != 'client' THEN
    RAISE EXCEPTION 'User must have client role to be assigned to a course';
  END IF;
  
  -- Insert or update assignment in junction table
  INSERT INTO public.client_golf_courses (
    client_id, 
    golf_club_id, 
    assigned_by,
    is_active
  )
  VALUES (
    p_client_id,
    p_golf_club_id,
    p_assigned_by,
    true
  )
  ON CONFLICT (client_id, golf_club_id) 
  DO UPDATE SET 
    is_active = true,
    assigned_at = NOW(),
    assigned_by = p_assigned_by
  RETURNING id INTO v_assignment_id;
  
  -- SYNC: Update users.club_id if it's null (first assignment)
  -- This keeps backward compatibility with code that reads users.club_id
  IF v_current_club_id IS NULL THEN
    UPDATE public.users 
    SET club_id = p_golf_club_id
    WHERE id = p_client_id;
  END IF;
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update remove_client_from_course to also update users.club_id
-- =====================================================
CREATE OR REPLACE FUNCTION public.remove_client_from_course(
  p_client_id UUID,
  p_golf_club_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_remaining_course UUID;
BEGIN
  -- Deactivate the assignment
  UPDATE public.client_golf_courses
  SET is_active = false
  WHERE client_id = p_client_id 
    AND golf_club_id = p_golf_club_id;
  
  -- SYNC: Update users.club_id
  -- If the removed course was the one in users.club_id, update to another active course
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_client_id AND club_id = p_golf_club_id
  ) THEN
    -- Find another active course for this client
    SELECT golf_club_id INTO v_remaining_course
    FROM public.client_golf_courses
    WHERE client_id = p_client_id AND is_active = true
    ORDER BY assigned_at DESC
    LIMIT 1;
    
    -- Update users.club_id to the remaining course (or NULL if none)
    UPDATE public.users 
    SET club_id = v_remaining_course
    WHERE id = p_client_id;
  END IF;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: One-time sync of existing data
-- =====================================================
-- This updates users.club_id for all clients who have assignments
-- in client_golf_courses but NULL in users.club_id

UPDATE public.users u
SET club_id = (
  SELECT cgc.golf_club_id 
  FROM public.client_golf_courses cgc
  WHERE cgc.client_id = u.id 
    AND cgc.is_active = true
  ORDER BY cgc.assigned_at ASC  -- First assigned course becomes primary
  LIMIT 1
)
WHERE u.role = 'client'
  AND u.club_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.client_golf_courses cgc
    WHERE cgc.client_id = u.id AND cgc.is_active = true
  );

-- Step 4: Verify the sync
-- =====================================================
-- Run this query to check the sync status:
/*
SELECT 
  u.id,
  u.email,
  u.club_id as users_club_id,
  gc.name as users_club_name,
  (
    SELECT string_agg(gc2.name, ', ')
    FROM client_golf_courses cgc
    JOIN golf_clubs gc2 ON cgc.golf_club_id = gc2.id
    WHERE cgc.client_id = u.id AND cgc.is_active = true
  ) as all_assigned_courses
FROM users u
LEFT JOIN golf_clubs gc ON u.club_id = gc.id
WHERE u.role = 'client'
ORDER BY u.email;
*/

-- =====================================================
-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- =====================================================
