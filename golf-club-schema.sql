-- Add user roles to users table
ALTER TABLE public.users ADD COLUMN role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client'));

-- Create golf clubs table
CREATE TABLE public.golf_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add golf_club_id to users table
ALTER TABLE public.users ADD COLUMN golf_club_id UUID REFERENCES public.golf_clubs(id);

-- Create trigger to update updated_at timestamp for golf_clubs
CREATE TRIGGER update_golf_clubs_updated_at BEFORE UPDATE ON public.golf_clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security for golf_clubs
ALTER TABLE public.golf_clubs ENABLE ROW LEVEL SECURITY;

-- Admins can view all golf clubs
CREATE POLICY "Admins can view all golf clubs" ON public.golf_clubs
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Clients can only view their own golf club
CREATE POLICY "Clients can view their own golf club" ON public.golf_clubs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND golf_club_id = golf_clubs.id
    )
  );

-- Admins can insert golf clubs
CREATE POLICY "Admins can insert golf clubs" ON public.golf_clubs
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Admins can update golf clubs
CREATE POLICY "Admins can update golf clubs" ON public.golf_clubs
  FOR UPDATE USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Modify images policies to respect golf club access
CREATE POLICY "Admins can view all images" ON public.images
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Update existing policy for clients to only see their golf club's images
DROP POLICY IF EXISTS "Users can view own images" ON public.images;
CREATE POLICY "Clients can view own golf club images" ON public.images
  FOR SELECT USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'client' AND
    EXISTS (
      SELECT 1 FROM public.users u1
      JOIN public.users u2 ON u1.golf_club_id = u2.golf_club_id
      WHERE u1.id = auth.uid() AND u2.id = images.user_id
    )
  );

-- Only admins can upload images
DROP POLICY IF EXISTS "Users can insert own images" ON public.images;
CREATE POLICY "Admins can insert images" ON public.images
  FOR INSERT WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin' AND
    auth.uid() = user_id
  );

-- Update the handle_new_user function to set default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;