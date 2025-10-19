-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS extension for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  organization TEXT,
  -- Role-based access: 'admin' or 'client'
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  -- Club membership
  club_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Golf clubs table
CREATE TABLE IF NOT EXISTS public.golf_clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key after golf_clubs creation
ALTER TABLE public.users
  ADD CONSTRAINT users_club_fk FOREIGN KEY (club_id) REFERENCES public.golf_clubs(id) ON DELETE SET NULL;

-- Images table for storing PNG tile metadata
CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  bucket TEXT DEFAULT 'raw-images',
  path TEXT NOT NULL,
  file_size BIGINT,
  content_type TEXT DEFAULT 'image/png',
  
  -- Geographic information
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  zoom_level INTEGER,
  tile_x INTEGER,
  tile_y INTEGER,
  
  -- Processing status
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Analysis results
  analysis_results JSONB,
  terrain_classification JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processing jobs table for tracking ML/Analysis tasks
CREATE TABLE public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Job details
  job_type TEXT NOT NULL CHECK (job_type IN ('golf_course_classification')),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 1,
  
  -- Processing details
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Results
  results JSONB,
  output_paths TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis sessions table for grouping related images
CREATE TABLE public.analysis_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  description TEXT,
  
  -- Geographic bounds for the session
  bounds JSONB, -- {north, south, east, west}
  
  -- Session status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session images junction table
CREATE TABLE public.session_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  image_id UUID NOT NULL REFERENCES public.images(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(session_id, image_id)
);

-- Storage policies for Supabase Storage
-- Raw images bucket policy
CREATE POLICY "Users can upload their own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'raw-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'raw-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'raw-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Processed images bucket policy
CREATE POLICY "Users can upload processed images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'processed-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view processed images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'processed-images' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golf_clubs ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
  );
$$ LANGUAGE sql STABLE;

-- Helper: get current user's club_id
CREATE OR REPLACE FUNCTION public.current_user_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT USING (public.is_admin());

-- Golf clubs policies
CREATE POLICY "Admins can manage clubs" ON public.golf_clubs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Clients can read clubs" ON public.golf_clubs
  FOR SELECT USING (true);

-- Images policies (club-based visibility; admin bypass)
CREATE POLICY "Images select by club or admin" ON public.images
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.users owner, public.users me
      WHERE owner.id = images.user_id AND me.id = auth.uid() AND owner.club_id IS NOT DISTINCT FROM me.club_id
    )
  );

CREATE POLICY "Users can insert own images" ON public.images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images or admin" ON public.images
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own images or admin" ON public.images
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Jobs select by club or admin" ON public.processing_jobs
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.users owner, public.users me
      WHERE owner.id = processing_jobs.user_id AND me.id = auth.uid() AND owner.club_id IS NOT DISTINCT FROM me.club_id
    )
  );

CREATE POLICY "Users can insert own processing jobs" ON public.processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processing jobs or admin" ON public.processing_jobs
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Sessions select by club or admin" ON public.analysis_sessions
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.users owner, public.users me
      WHERE owner.id = analysis_sessions.user_id AND me.id = auth.uid() AND owner.club_id IS NOT DISTINCT FROM me.club_id
    )
  );

CREATE POLICY "Users can insert own analysis sessions" ON public.analysis_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions or admin" ON public.analysis_sessions
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete own sessions or admin" ON public.analysis_sessions
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Session images select by club or admin" ON public.session_images
  FOR SELECT USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.analysis_sessions s, public.users owner, public.users me
      WHERE s.id = session_images.session_id AND owner.id = s.user_id AND me.id = auth.uid() AND owner.club_id IS NOT DISTINCT FROM me.club_id
    )
  );

CREATE POLICY "Users can insert session images" ON public.session_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions 
      WHERE id = session_images.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete session images or admin" ON public.session_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions 
      WHERE id = session_images.session_id AND user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Functions and triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON public.images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_processing_jobs_updated_at BEFORE UPDATE ON public.processing_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_analysis_sessions_updated_at BEFORE UPDATE ON public.analysis_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to trigger image processing
CREATE OR REPLACE FUNCTION public.trigger_image_processing()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a processing job when a new image is uploaded
  INSERT INTO public.processing_jobs (image_id, user_id, job_type, status)
  VALUES (NEW.id, NEW.user_id, 'golf_course_classification', 'queued');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create processing job for new images
CREATE TRIGGER on_image_uploaded
  AFTER INSERT ON public.images
  FOR EACH ROW EXECUTE FUNCTION public.trigger_image_processing();

-- Indexes for better performance
CREATE INDEX idx_images_user_id ON public.images(user_id);
CREATE INDEX idx_images_status ON public.images(status);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);
CREATE INDEX idx_images_geographic ON public.images USING GIST(ST_Point(lon, lat));
CREATE INDEX idx_processing_jobs_image_id ON public.processing_jobs(image_id);
CREATE INDEX idx_processing_jobs_status ON public.processing_jobs(status);
CREATE INDEX idx_processing_jobs_user_id ON public.processing_jobs(user_id);
CREATE INDEX idx_analysis_sessions_user_id ON public.analysis_sessions(user_id);
CREATE INDEX idx_session_images_session_id ON public.session_images(session_id);
CREATE INDEX idx_session_images_image_id ON public.session_images(image_id);

-- Seed helper: optional initial golf clubs and role assignment (safe to re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.golf_clubs WHERE name = 'The Best Golf') THEN
    INSERT INTO public.golf_clubs (name) VALUES ('The Best Golf');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.golf_clubs WHERE name = 'Green Hills Club') THEN
    INSERT INTO public.golf_clubs (name) VALUES ('Green Hills Club');
  END IF;
END $$;

-- Example: map existing users by email to clubs/roles (edit emails as needed)
-- UPDATE public.users SET role = 'admin' WHERE email IN ('admin@example.com');
-- UPDATE public.users SET role = 'client', club_id = (SELECT id FROM public.golf_clubs WHERE name = 'The Best Golf') WHERE email IN ('client1@example.com');
