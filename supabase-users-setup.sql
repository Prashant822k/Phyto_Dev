-- NOTE: This script must be run as the postgres role or with service_role key
-- IMPORTANT: Run each section separately to avoid dependency errors

-- Step 1: Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Create golf_clubs table first (run this statement separately)
CREATE TABLE IF NOT EXISTS public.golf_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Step 3: Insert a default golf club (run after creating the golf_clubs table)
INSERT INTO public.golf_clubs (name, location)
VALUES ('Default Golf Club', 'Default Location')
ON CONFLICT DO NOTHING;

-- Step 4: Create users table (run after creating the golf_clubs table)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  golf_club_id UUID REFERENCES public.golf_clubs(id),
  organization TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create golf_clubs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.golf_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insert a default golf club for testing
INSERT INTO public.golf_clubs (name, location)
VALUES ('Default Golf Club', 'Default Location')
ON CONFLICT DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_clubs ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all user data" 
  ON public.users 
  FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create policies for golf_clubs table
CREATE POLICY "Anyone can view golf clubs" 
  ON public.golf_clubs 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, golf_club_id, organization)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    (NEW.raw_user_meta_data->>'golf_club_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'organization', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();