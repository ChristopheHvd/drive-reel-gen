-- Add explicit policy to deny unauthenticated access to user_profiles
-- This prevents email harvesting attacks from anonymous users

CREATE POLICY "Deny unauthenticated access to user_profiles"
ON public.user_profiles
FOR SELECT
TO anon
USING (false);