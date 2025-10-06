-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS extension for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  organization TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Images policies
CREATE POLICY "Users can view own images" ON public.images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON public.images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON public.images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON public.images
  FOR DELETE USING (auth.uid() = user_id);

-- Processing jobs policies
CREATE POLICY "Users can view own processing jobs" ON public.processing_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own processing jobs" ON public.processing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own processing jobs" ON public.processing_jobs
  FOR UPDATE USING (auth.uid() = user_id);

-- Analysis sessions policies
CREATE POLICY "Users can view own analysis sessions" ON public.analysis_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis sessions" ON public.analysis_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis sessions" ON public.analysis_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis sessions" ON public.analysis_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Session images policies
CREATE POLICY "Users can view session images" ON public.session_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions 
      WHERE id = session_images.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert session images" ON public.session_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions 
      WHERE id = session_images.session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete session images" ON public.session_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions 
      WHERE id = session_images.session_id AND user_id = auth.uid()
    )
  );

-- Functions and triggers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
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
