-- ============================================
-- PHASE 0: NETTOYAGE COMPLET BASE DE DONNÉES
-- ============================================

-- Supprimer toutes les données existantes
TRUNCATE TABLE drive_images CASCADE;
TRUNCATE TABLE drive_folders CASCADE;
TRUNCATE TABLE drive_tokens CASCADE;
TRUNCATE TABLE brand_profiles CASCADE;
TRUNCATE TABLE user_subscriptions CASCADE;
TRUNCATE TABLE user_profiles CASCADE;

-- ============================================
-- PHASE 1: LOGIQUE TEAM-FIRST
-- ============================================

-- 1.1 Créer enum pour les rôles d'équipe
CREATE TYPE public.team_role AS ENUM ('owner', 'admin', 'member');

-- 1.2 Créer table teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_owner_id ON public.teams(owner_id);

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.3 Créer table team_members (many-to-many)
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);

-- 1.4 Créer fonctions helper pour RLS
CREATE OR REPLACE FUNCTION public.user_teams()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id 
  FROM public.team_members 
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members 
    WHERE team_id = _team_id 
      AND user_id = auth.uid() 
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin(_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members 
    WHERE team_id = _team_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
  );
$$;

-- 1.5 RLS pour teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their teams"
ON public.teams FOR SELECT
TO authenticated
USING (id IN (SELECT public.user_teams()));

CREATE POLICY "Team owners can update their teams"
ON public.teams FOR UPDATE
TO authenticated
USING (public.is_team_owner(id))
WITH CHECK (public.is_team_owner(id));

CREATE POLICY "Users can create teams"
ON public.teams FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can delete their teams"
ON public.teams FOR DELETE
TO authenticated
USING (public.is_team_owner(id));

-- 1.6 RLS pour team_members
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team members"
ON public.team_members FOR SELECT
TO authenticated
USING (team_id IN (SELECT public.user_teams()));

CREATE POLICY "Team admins can insert members"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (public.is_team_admin(team_id));

CREATE POLICY "Team admins can update members"
ON public.team_members FOR UPDATE
TO authenticated
USING (public.is_team_admin(team_id))
WITH CHECK (public.is_team_admin(team_id));

CREATE POLICY "Team admins can delete members"
ON public.team_members FOR DELETE
TO authenticated
USING (public.is_team_admin(team_id));

-- 1.7 MODIFIER le trigger handle_new_user()
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_team_id UUID;
  user_full_name TEXT;
BEGIN
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Mon Équipe');
  
  INSERT INTO public.teams (owner_id, name)
  VALUES (NEW.id, user_full_name || ' Team')
  RETURNING id INTO new_team_id;
  
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new_team_id, NEW.id, 'owner');
  
  INSERT INTO public.user_profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_subscriptions (user_id, team_id, plan_type, video_limit, videos_generated_this_month)
  VALUES (NEW.id, new_team_id, 'free', 6, 0);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PHASE 2: MIGRATION VERS LOGIQUE TEAM
-- ============================================

-- 2.1 Ajouter team_id à user_subscriptions
ALTER TABLE public.user_subscriptions
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX idx_user_subscriptions_team_id ON public.user_subscriptions(team_id);

-- 2.2 Modifier brand_profiles : SUPPRIMER D'ABORD LES POLICIES
DROP POLICY IF EXISTS "Users can view their own brand profile" ON public.brand_profiles;
DROP POLICY IF EXISTS "Users can insert their own brand profile" ON public.brand_profiles;
DROP POLICY IF EXISTS "Users can update their own brand profile" ON public.brand_profiles;

-- Ensuite supprimer la colonne user_id et ajouter team_id
ALTER TABLE public.brand_profiles
DROP COLUMN IF EXISTS user_id CASCADE;

ALTER TABLE public.brand_profiles
ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

CREATE INDEX idx_brand_profiles_team_id ON public.brand_profiles(team_id);

-- Créer les nouvelles RLS policies
CREATE POLICY "Team members can view brand profile"
ON public.brand_profiles FOR SELECT
TO authenticated
USING (team_id IN (SELECT public.user_teams()));

CREATE POLICY "Team members can insert brand profile"
ON public.brand_profiles FOR INSERT
TO authenticated
WITH CHECK (team_id IN (SELECT public.user_teams()));

CREATE POLICY "Team admins can update brand profile"
ON public.brand_profiles FOR UPDATE
TO authenticated
USING (public.is_team_admin(team_id))
WITH CHECK (public.is_team_admin(team_id));

CREATE POLICY "Team owners can delete brand profile"
ON public.brand_profiles FOR DELETE
TO authenticated
USING (public.is_team_owner(team_id));

-- 2.3 Créer table images (liée à team_id)
CREATE TABLE public.images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic')),
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_images_team_id ON public.images(team_id);
CREATE INDEX idx_images_uploaded_by ON public.images(uploaded_by);
CREATE INDEX idx_images_created_at ON public.images(created_at DESC);

CREATE TRIGGER update_images_updated_at
  BEFORE UPDATE ON public.images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team images"
ON public.images FOR SELECT
TO authenticated
USING (team_id IN (SELECT public.user_teams()));

CREATE POLICY "Team members can insert team images"
ON public.images FOR INSERT
TO authenticated
WITH CHECK (team_id IN (SELECT public.user_teams()));

CREATE POLICY "Team members can update team images"
ON public.images FOR UPDATE
TO authenticated
USING (team_id IN (SELECT public.user_teams()))
WITH CHECK (team_id IN (SELECT public.user_teams()));

CREATE POLICY "Team members can delete team images"
ON public.images FOR DELETE
TO authenticated
USING (team_id IN (SELECT public.user_teams()));

-- 2.4 Créer storage bucket team-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-images',
  'team-images',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
);

-- RLS pour storage.objects
CREATE POLICY "Team members can upload team images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'team-images'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_teams())
);

CREATE POLICY "Team members can view team images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'team-images'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_teams())
);

CREATE POLICY "Team members can delete team images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'team-images'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_teams())
);

CREATE POLICY "Team members can update team images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-images'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_teams())
)
WITH CHECK (
  bucket_id = 'team-images'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_teams())
);

-- 2.5 Supprimer les tables Google Drive
DROP TABLE IF EXISTS public.drive_images CASCADE;
DROP TABLE IF EXISTS public.drive_folders CASCADE;
DROP TABLE IF EXISTS public.drive_tokens CASCADE;

-- 2.6 Retirer has_completed_onboarding de user_profiles
ALTER TABLE public.user_profiles
DROP COLUMN IF EXISTS has_completed_onboarding;