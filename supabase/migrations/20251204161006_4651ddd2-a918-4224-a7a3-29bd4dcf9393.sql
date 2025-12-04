-- Fix user_profiles RLS: require authentication AND allow team members to view each other
-- First, drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;

-- Create a new policy that allows:
-- 1. Viewing your own profile
-- 2. Viewing profiles of users in your team(s)
-- This ensures authentication is REQUIRED (TO authenticated)
CREATE POLICY "Users can view own and team member profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR user_id IN (
    SELECT tm.user_id 
    FROM public.team_members tm 
    WHERE tm.team_id IN (SELECT user_teams())
  )
);