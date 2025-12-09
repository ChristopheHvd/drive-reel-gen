-- Bloquer explicitement les requêtes anonymes sur user_profiles
CREATE POLICY "Deny anonymous access to user_profiles"
ON public.user_profiles
FOR SELECT
TO anon
USING (false);