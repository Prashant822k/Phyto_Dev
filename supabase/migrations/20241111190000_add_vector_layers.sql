-- Create vector_layers table
CREATE TABLE IF NOT EXISTS public.vector_layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  golf_course_id UUID NOT NULL REFERENCES public.golf_courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  layer_type TEXT NOT NULL, -- 'holes', 'wetlands', 'woodlands', etc.
  geojson JSONB NOT NULL,
  style JSONB, -- Store layer styling
  z_index INTEGER DEFAULT 0, -- For layer ordering
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.vector_layers ENABLE ROW LEVEL SECURITY;

-- Create policies for vector_layers
CREATE POLICY "Enable read access for authenticated users"
  ON public.vector_layers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for admin users"
  ON public.vector_layers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT user_id FROM public.user_roles 
    WHERE role = 'admin' OR role = 'course_admin'
  ));

-- Create index for faster lookups
CREATE INDEX idx_vector_layers_golf_course ON public.vector_layers(golf_course_id);
CREATE INDEX idx_vector_layers_type ON public.vector_layers(layer_type);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_vector_layers_updated_at
BEFORE UPDATE ON public.vector_layers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
