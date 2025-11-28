-- =====================================================
-- Multi-Course Client Assignment System
-- =====================================================
-- This migration enables one client to be assigned to multiple golf courses
-- Relationship: One Client → Many Courses (but each course still belongs to only one client)

-- Step 1: Create junction table for client-golf course assignments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.client_golf_courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  golf_club_id UUID NOT NULL REFERENCES public.golf_clubs(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.users(id), -- Admin who assigned
  is_active BOOLEAN DEFAULT true,
  
  -- Ensure a client can only be assigned to a course once
  UNIQUE(client_id, golf_club_id)
);

-- Step 2: Add client_id to golf_clubs for backward compatibility
-- =====================================================
-- This allows courses to optionally have a primary client
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'golf_clubs' 
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.golf_clubs 
    ADD COLUMN client_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_golf_clubs_client_id ON public.golf_clubs(client_id);
  END IF;
END $$;

-- Step 3: Enable RLS on new table
-- =====================================================
ALTER TABLE public.client_golf_courses ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for client_golf_courses
-- =====================================================

-- Admins can manage all assignments
CREATE POLICY "Admins can manage client course assignments" 
ON public.client_golf_courses
FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Clients can view their own assignments
CREATE POLICY "Clients can view their own course assignments" 
ON public.client_golf_courses
FOR SELECT 
USING (client_id = auth.uid());

-- Step 5: Create helper functions
-- =====================================================

-- Function to get all golf courses assigned to a client
CREATE OR REPLACE FUNCTION public.get_client_golf_courses(user_id UUID)
RETURNS TABLE (
  golf_club_id UUID,
  golf_club_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gc.id,
    gc.name,
    cgc.assigned_at,
    cgc.is_active
  FROM public.client_golf_courses cgc
  JOIN public.golf_clubs gc ON cgc.golf_club_id = gc.id
  WHERE cgc.client_id = user_id 
    AND cgc.is_active = true
  ORDER BY cgc.assigned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a client has access to a specific golf course
CREATE OR REPLACE FUNCTION public.client_has_course_access(
  user_id UUID,
  course_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.client_golf_courses 
    WHERE client_id = user_id 
      AND golf_club_id = course_id 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign a client to a golf course
CREATE OR REPLACE FUNCTION public.assign_client_to_course(
  p_client_id UUID,
  p_golf_club_id UUID,
  p_assigned_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_assignment_id UUID;
  v_client_role TEXT;
BEGIN
  -- Verify the user is a client
  SELECT role INTO v_client_role 
  FROM public.users 
  WHERE id = p_client_id;
  
  IF v_client_role != 'client' THEN
    RAISE EXCEPTION 'User must have client role to be assigned to a course';
  END IF;
  
  -- Insert or update assignment
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
  
  RETURN v_assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a client from a golf course
CREATE OR REPLACE FUNCTION public.remove_client_from_course(
  p_client_id UUID,
  p_golf_club_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.client_golf_courses
  SET is_active = false
  WHERE client_id = p_client_id 
    AND golf_club_id = p_golf_club_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update existing RLS policies for golf_clubs
-- =====================================================

-- Drop old client read policy if exists
DROP POLICY IF EXISTS "Clients can read clubs" ON public.golf_clubs;

-- Clients can read golf clubs they are assigned to
CREATE POLICY "Clients can read assigned clubs" 
ON public.golf_clubs
FOR SELECT 
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 
    FROM public.client_golf_courses 
    WHERE golf_club_id = golf_clubs.id 
      AND client_id = auth.uid() 
      AND is_active = true
  )
);

-- Step 7: Update RLS policies for tilesets to support multi-course access
-- =====================================================

-- Drop old tileset policy if exists
DROP POLICY IF EXISTS "Clients can view their club's tilesets" ON public.golf_course_tilesets;

-- Clients can view tilesets for any course they're assigned to
CREATE POLICY "Clients can view assigned course tilesets" 
ON public.golf_course_tilesets
FOR SELECT 
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 
    FROM public.client_golf_courses 
    WHERE golf_club_id = golf_course_tilesets.golf_club_id 
      AND client_id = auth.uid() 
      AND is_active = true
  )
);

-- Step 8: Update RLS policies for images to support multi-course access
-- =====================================================

-- Drop old image select policy
DROP POLICY IF EXISTS "Images select by club or admin" ON public.images;

-- Recreate with multi-course support
CREATE POLICY "Images select by assigned courses or admin" 
ON public.images
FOR SELECT 
USING (
  public.is_admin() OR
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 
    FROM public.users owner
    JOIN public.client_golf_courses cgc ON cgc.golf_club_id = owner.club_id
    WHERE owner.id = images.user_id 
      AND cgc.client_id = auth.uid() 
      AND cgc.is_active = true
  )
);

-- Step 9: Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_client_golf_courses_client_id 
  ON public.client_golf_courses(client_id);
  
CREATE INDEX IF NOT EXISTS idx_client_golf_courses_golf_club_id 
  ON public.client_golf_courses(golf_club_id);
  
CREATE INDEX IF NOT EXISTS idx_client_golf_courses_active 
  ON public.client_golf_courses(is_active) 
  WHERE is_active = true;

-- Step 10: Migrate existing single-club assignments to junction table
-- =====================================================
-- This preserves existing club_id assignments in users table
INSERT INTO public.client_golf_courses (client_id, golf_club_id, is_active)
SELECT 
  u.id,
  u.club_id,
  true
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

-- Step 11: Add trigger to auto-sync club_id changes
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_club_id_to_assignments()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user's club_id is updated, ensure it's in the junction table
  IF NEW.club_id IS NOT NULL AND NEW.role = 'client' THEN
    INSERT INTO public.client_golf_courses (client_id, golf_club_id, is_active)
    VALUES (NEW.id, NEW.club_id, true)
    ON CONFLICT (client_id, golf_club_id) 
    DO UPDATE SET is_active = true, assigned_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_club_id_trigger ON public.users;
CREATE TRIGGER sync_club_id_trigger
  AFTER INSERT OR UPDATE OF club_id ON public.users
  FOR EACH ROW
  WHEN (NEW.role = 'client')
  EXECUTE FUNCTION public.sync_club_id_to_assignments();

-- Step 12: Grant necessary permissions
-- =====================================================
GRANT SELECT ON public.client_golf_courses TO authenticated;
GRANT SELECT ON public.golf_clubs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_golf_courses(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_has_course_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_client_to_course(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_client_from_course(UUID, UUID) TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- 1. Created client_golf_courses junction table for many-to-many relationships
-- 2. Added client_id to golf_clubs for backward compatibility
-- 3. Created helper functions for course assignment operations
-- 4. Updated RLS policies to support multi-course access
-- 5. Migrated existing assignments to new structure
-- 6. Added performance indexes
