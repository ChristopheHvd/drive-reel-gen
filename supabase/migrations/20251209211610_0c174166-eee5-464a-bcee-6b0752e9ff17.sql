-- 1. Modifier le trigger handle_new_user() pour ne pas créer de subscription pour les membres invités
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    
    -- NE PAS créer de subscription : le membre utilise celle de l'équipe existante
    
  ELSE
    -- Pas d'invitation : créer une nouvelle team pour cet utilisateur
    INSERT INTO public.teams (owner_id, name)
    VALUES (NEW.id, user_full_name || ' Team')
    RETURNING id INTO new_team_id;
    
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (new_team_id, NEW.id, 'owner');
    
    -- Créer la subscription seulement pour les nouveaux owners
    INSERT INTO public.user_subscriptions (user_id, team_id, plan_type, video_limit, videos_generated_this_month)
    VALUES (NEW.id, new_team_id, 'free', 6, 0);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Mettre à jour les policies RLS pour permettre aux membres de voir la subscription de leur équipe
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;

CREATE POLICY "Team members can view team subscription"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (team_id IN (SELECT user_teams()));

-- 3. Supprimer les anciennes policies restrictives et ajouter une policy pour UPDATE par le owner uniquement
DROP POLICY IF EXISTS "Users cannot update subscriptions" ON public.user_subscriptions;

CREATE POLICY "Team owners can update subscription"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = user_subscriptions.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = user_subscriptions.team_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'owner'
  )
);

-- 4. Nettoyer les subscriptions orphelines (membres invités qui ont reçu une subscription par erreur)
DELETE FROM public.user_subscriptions us
WHERE EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.user_id = us.user_id
    AND tm.role != 'owner'
    AND tm.team_id = us.team_id
);