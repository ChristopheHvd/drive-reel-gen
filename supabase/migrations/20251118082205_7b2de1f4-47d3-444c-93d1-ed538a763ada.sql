-- Create brand_profiles table
CREATE TABLE public.brand_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  website_url text,
  business_description text,
  target_audience text,
  brand_values jsonb,
  visual_identity jsonb,
  tone_of_voice text,
  analyzed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own brand profile"
ON public.brand_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand profile"
ON public.brand_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand profile"
ON public.brand_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_brand_profiles_updated_at
BEFORE UPDATE ON public.brand_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();