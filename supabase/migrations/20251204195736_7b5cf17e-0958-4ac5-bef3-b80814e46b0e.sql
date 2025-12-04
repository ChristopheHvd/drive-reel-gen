-- Add restrictive RLS policies for user_subscriptions
-- Users should NOT be able to INSERT, UPDATE, or DELETE their subscription data
-- Only backend services (service_role) can modify this data

-- Explicitly deny INSERT for authenticated users (subscriptions created by trigger/backend only)
CREATE POLICY "Users cannot insert subscriptions"
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Explicitly deny UPDATE for authenticated users (only backend/webhooks can update)
CREATE POLICY "Users cannot update subscriptions"
ON public.user_subscriptions
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- Explicitly deny DELETE for authenticated users
CREATE POLICY "Users cannot delete subscriptions"
ON public.user_subscriptions
FOR DELETE
TO authenticated
USING (false);