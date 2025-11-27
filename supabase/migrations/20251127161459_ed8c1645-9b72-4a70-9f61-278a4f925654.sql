-- Nettoyage des 52 utilisateurs de test créés par les tests RLS
-- L'ordre est important à cause des contraintes de clés étrangères

-- 1. Supprimer les subscriptions des utilisateurs de test
DELETE FROM public.user_subscriptions 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%@example.com'
);

-- 2. Supprimer les team_members des utilisateurs de test
DELETE FROM public.team_members 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%@example.com'
);

-- 3. Supprimer les user_profiles des utilisateurs de test
DELETE FROM public.user_profiles 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%@example.com'
);

-- 4. Supprimer les teams créées par les utilisateurs de test
DELETE FROM public.teams 
WHERE owner_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'test-%@example.com'
);

-- 5. Supprimer les utilisateurs de test eux-mêmes
DELETE FROM auth.users WHERE email LIKE 'test-%@example.com';