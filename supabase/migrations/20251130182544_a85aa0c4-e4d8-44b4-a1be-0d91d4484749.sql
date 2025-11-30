-- ============================================
-- SYSTÈME D'INVITATIONS D'ÉQUIPE
-- ============================================

-- 1. Créer la table team_invitations
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role public.team_role DEFAULT 'member' NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  
  -- Contrainte : une seule invitation pending par email et team
  UNIQUE (team_id, email, status)
);

-- Index pour performance
CREATE INDEX idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX idx_team_invitations_status ON public.team_invitations(status);

-- 2. Activer RLS sur team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies pour team_invitations

-- Les admins peuvent voir toutes les invitations de leur team
CREATE POLICY "Team admins can view team invitations"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (is_team_admin(team_id));

-- Les admins peuvent créer des invitations pour leur team
CREATE POLICY "Team admins can create invitations"
ON public.team_invitations
FOR INSERT
TO authenticated
WITH CHECK (is_team_admin(team_id));

-- Les admins peuvent modifier les invitations de leur team (annuler, renvoyer)
CREATE POLICY "Team admins can update team invitations"
ON public.team_invitations
FOR UPDATE
TO authenticated
USING (is_team_admin(team_id))
WITH CHECK (is_team_admin(team_id));

-- Les admins peuvent supprimer les invitations de leur team
CREATE POLICY "Team admins can delete team invitations"
ON public.team_invitations
FOR DELETE
TO authenticated
USING (is_team_admin(team_id));

-- Lecture publique par token (pour afficher les détails d'invitation)
CREATE POLICY "Public can view invitation by token"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (token IS NOT NULL);

-- 4. Fonction pour vérifier si un utilisateur est déjà membre d'une team
CREATE OR REPLACE FUNCTION public.user_has_team()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT team_id 
  FROM public.team_members 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 5. Modifier le trigger handle_new_user pour gérer les invitations
-- Supprimer l'ancien trigger et la fonction
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Créer la nouvelle fonction avec gestion des invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_team_id UUID;
  user_full_name TEXT;
  pending_invitation RECORD;
BEGIN
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Mon Équipe');
  
  -- Créer le profil utilisateur
  INSERT INTO public.user_profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Vérifier s'il existe une invitation pending pour cet email
  SELECT * INTO pending_invitation
  FROM public.team_invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF pending_invitation.id IS NOT NULL THEN
    -- L'utilisateur a une invitation : le joindre à cette team
    new_team_id := pending_invitation.team_id;
    
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (new_team_id, NEW.id, pending_invitation.role);
    
    -- Marquer l'invitation comme acceptée
    UPDATE public.team_invitations
    SET status = 'accepted',
        accepted_at = NOW()
    WHERE id = pending_invitation.id;
    
    -- Créer la subscription liée à cette team
    INSERT INTO public.user_subscriptions (user_id, team_id, plan_type, video_limit, videos_generated_this_month)
    VALUES (NEW.id, new_team_id, 'free', 6, 0);
    
  ELSE
    -- Pas d'invitation : créer une nouvelle team pour cet utilisateur
    INSERT INTO public.teams (owner_id, name)
    VALUES (NEW.id, user_full_name || ' Team')
    RETURNING id INTO new_team_id;
    
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (new_team_id, NEW.id, 'owner');
    
    INSERT INTO public.user_subscriptions (user_id, team_id, plan_type, video_limit, videos_generated_this_month)
    VALUES (NEW.id, new_team_id, 'free', 6, 0);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Fonction pour envoyer une invitation (appelée depuis l'Edge Function)
CREATE OR REPLACE FUNCTION public.can_invite_to_team(_team_id UUID, _inviter_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_team_admin(_team_id);
$$;

-- 7. Ajouter un trigger pour marquer automatiquement les invitations expirées
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.team_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
  RETURN NULL;
END;
$$;

-- Trigger qui s'exécute périodiquement (via pg_cron ou manuellement)
-- Note: Dans Supabase, on utiliserait plutôt un Edge Function avec cron