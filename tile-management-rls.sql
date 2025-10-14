-- Enable Row Level Security on tile_uploads table
ALTER TABLE public.tile_uploads ENABLE ROW LEVEL SECURITY;

-- Policies for tile_uploads table
-- Admins can view all tile uploads
CREATE POLICY "Admins can view all tile uploads" ON public.tile_uploads
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Clients can only view tile uploads for their assigned clubs
CREATE POLICY "Clients can view their club's tile uploads" ON public.tile_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_club_links
      WHERE user_id = auth.uid() AND club_id = tile_uploads.club_id
    )
  );

-- Only admins can insert tile uploads
CREATE POLICY "Admins can insert tile uploads" ON public.tile_uploads
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can update tile uploads
CREATE POLICY "Admins can update tile uploads" ON public.tile_uploads
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can delete tile uploads
CREATE POLICY "Admins can delete tile uploads" ON public.tile_uploads
  FOR DELETE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Enable Row Level Security on user_club_links table
ALTER TABLE public.user_club_links ENABLE ROW LEVEL SECURITY;

-- Policies for user_club_links table
-- Admins can view all user-club links
CREATE POLICY "Admins can view all user-club links" ON public.user_club_links
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Clients can only view their own user-club links
CREATE POLICY "Clients can view their own user-club links" ON public.user_club_links
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Only admins can insert user-club links
CREATE POLICY "Admins can insert user-club links" ON public.user_club_links
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can update user-club links
CREATE POLICY "Admins can update user-club links" ON public.user_club_links
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can delete user-club links
CREATE POLICY "Admins can delete user-club links" ON public.user_club_links
  FOR DELETE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Enable Row Level Security on golf_clubs table (if not already enabled)
ALTER TABLE public.golf_clubs ENABLE ROW LEVEL SECURITY;

-- Policies for golf_clubs table
-- Admins can view all golf clubs
CREATE POLICY IF NOT EXISTS "Admins can view all golf clubs" ON public.golf_clubs
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Clients can view golf clubs they're linked to
CREATE POLICY IF NOT EXISTS "Clients can view linked golf clubs" ON public.golf_clubs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_club_links
      WHERE user_id = auth.uid() AND club_id = golf_clubs.id
    )
  );

-- Only admins can insert golf clubs
CREATE POLICY IF NOT EXISTS "Admins can insert golf clubs" ON public.golf_clubs
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can update golf clubs
CREATE POLICY IF NOT EXISTS "Admins can update golf clubs" ON public.golf_clubs
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can delete golf clubs
CREATE POLICY IF NOT EXISTS "Admins can delete golf clubs" ON public.golf_clubs
  FOR DELETE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );