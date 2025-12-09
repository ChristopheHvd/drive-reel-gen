-- Bloquer explicitement les requêtes anonymes sur toutes les tables sensibles

-- team_invitations
CREATE POLICY "Deny anonymous access to team_invitations"
ON public.team_invitations
FOR SELECT
TO anon
USING (false);

-- teams
CREATE POLICY "Deny anonymous access to teams"
ON public.teams
FOR SELECT
TO anon
USING (false);

-- team_members
CREATE POLICY "Deny anonymous access to team_members"
ON public.team_members
FOR SELECT
TO anon
USING (false);

-- brand_profiles
CREATE POLICY "Deny anonymous access to brand_profiles"
ON public.brand_profiles
FOR SELECT
TO anon
USING (false);

-- images
CREATE POLICY "Deny anonymous access to images"
ON public.images
FOR SELECT
TO anon
USING (false);

-- videos
CREATE POLICY "Deny anonymous access to videos"
ON public.videos
FOR SELECT
TO anon
USING (false);