-- Supprimer les anciennes politiques sur user_subscriptions
DROP POLICY IF EXISTS "Deny anonymous access to user_subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Team members can view team subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Team owners can update subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users cannot delete subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "Users cannot insert subscriptions" ON user_subscriptions;

-- Recréer les politiques avec une vérification d'authentification explicite

-- Politique SELECT : Seuls les membres authentifiés de l'équipe peuvent voir la subscription
CREATE POLICY "Team members can view team subscription"
ON user_subscriptions
FOR SELECT
TO authenticated
USING (team_id IN (SELECT user_teams()));

-- Politique UPDATE : Seuls les owners authentifiés peuvent modifier
CREATE POLICY "Team owners can update subscription"
ON user_subscriptions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = user_subscriptions.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = user_subscriptions.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'owner'
  )
);

-- Politique INSERT : Personne ne peut insérer directement (géré par trigger)
CREATE POLICY "Users cannot insert subscriptions"
ON user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Politique DELETE : Personne ne peut supprimer
CREATE POLICY "Users cannot delete subscriptions"
ON user_subscriptions
FOR DELETE
TO authenticated
USING (false);