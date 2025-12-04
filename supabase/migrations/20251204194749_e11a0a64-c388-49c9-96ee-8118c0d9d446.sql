-- Fix team_invitations security: remove public SELECT policy and create secure function
-- The current policy "token IS NOT NULL" exposes ALL invitations

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "Public can view invitation by token" ON public.team_invitations;

-- Create a secure function to fetch invitation by token
-- This function only returns the specific invitation matching the token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  email text,
  role public.team_role,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  team_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ti.id,
    ti.team_id,
    ti.email,
    ti.role,
    ti.status,
    ti.expires_at,
    ti.created_at,
    t.name as team_name
  FROM public.team_invitations ti
  JOIN public.teams t ON t.id = ti.team_id
  WHERE ti.token = _token
  LIMIT 1;
$$;