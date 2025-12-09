-- Bloquer explicitement les requêtes anonymes sur user_subscriptions
CREATE POLICY "Deny anonymous access to user_subscriptions"
ON public.user_subscriptions
FOR SELECT
TO anon
USING (false);