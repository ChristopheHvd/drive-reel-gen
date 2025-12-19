-- Add analysis_status column to brand_profiles
ALTER TABLE public.brand_profiles 
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT NULL;

-- Add check constraint
ALTER TABLE public.brand_profiles
ADD CONSTRAINT brand_profiles_analysis_status_check 
CHECK (analysis_status IS NULL OR analysis_status IN ('pending', 'completed', 'failed'));

-- Enable realtime for brand_profiles to listen to status changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_profiles;