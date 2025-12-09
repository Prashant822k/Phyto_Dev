-- Final migration script to add R2 support with club-based access control
-- This script handles PostgreSQL constraint limitations

-- Step 1: Create golf_clubs table
CREATE TABLE IF NOT EXISTS public.golf_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add role column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';

-- Step 3: Add check constraint for role (handle if it already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'users_role_check') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','client'));
  END IF;
END $$;

-- Step 4: Add club_id column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS club_id UUID;

-- Step 5: Add foreign key constraint (handle if it already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'users_club_fk') THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_club_fk 
    FOREIGN KEY (club_id) REFERENCES public.golf_clubs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 6: Enable RLS on golf_clubs
ALTER TABLE public.golf_clubs ENABLE ROW LEVEL SECURITY;

-- Step 7: Create is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
  );
$$ LANGUAGE sql STABLE;

-- Step 8: Create current_user_club_id function
CREATE OR REPLACE FUNCTION public.current_user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Step 9: Create golf clubs policies
DROP POLICY IF EXISTS "Admins can manage clubs" ON public.golf_clubs;
DROP POLICY IF EXISTS "Clients can read clubs" ON public.golf_clubs;

CREATE POLICY "Admins can manage clubs" ON public.golf_clubs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Clients can read clubs" ON public.golf_clubs
  FOR SELECT USING (true);

-- Step 10: Update image policies for club-based access
DROP POLICY IF EXISTS "Images select by club or admin" ON public.images;
CREATE POLICY "Images select by club or admin" ON public.images
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.users owner, public.users me
      WHERE owner.id = images.user_id AND me.id = auth.uid() 
      AND owner.club_id IS NOT DISTINCT FROM me.club_id
    )
  );

-- Step 11: Update processing jobs policies
DROP POLICY IF EXISTS "Jobs select by club or admin" ON public.processing_jobs;
CREATE POLICY "Jobs select by club or admin" ON public.processing_jobs
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.users owner, public.users me
      WHERE owner.id = processing_jobs.user_id AND me.id = auth.uid() 
      AND owner.club_id IS NOT DISTINCT FROM me.club_id
    )
  );

-- Step 12: Update analysis sessions policies
DROP POLICY IF EXISTS "Sessions select by club or admin" ON public.analysis_sessions;
CREATE POLICY "Sessions select by club or admin" ON public.analysis_sessions
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.users owner, public.users me
      WHERE owner.id = analysis_sessions.user_id AND me.id = auth.uid() 
      AND owner.club_id IS NOT DISTINCT FROM me.club_id
    )
  );

-- Step 13: Update session images policies
DROP POLICY IF EXISTS "Session images select by club or admin" ON public.session_images;
CREATE POLICY "Session images select by club or admin" ON public.session_images
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.analysis_sessions s, public.users owner, public.users me
      WHERE s.id = session_images.session_id AND owner.id = s.user_id AND me.id = auth.uid() 
      AND owner.club_id IS NOT DISTINCT FROM me.club_id
    )
  );

-- Step 14: Update users policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (public.is_admin());

-- Step 15: Seed initial data
INSERT INTO public.golf_clubs (name) VALUES ('The Best Golf') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.golf_clubs (name) VALUES ('Green Hills Club') ON CONFLICT (name) DO NOTHING;

-- Step 16: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_club_id ON public.users(club_id);
CREATE INDEX IF NOT EXISTS idx_golf_clubs_name ON public.golf_clubs(name);

-- Step 17: Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Migration completed successfully! Golf clubs and role-based access control have been added.' as message;
