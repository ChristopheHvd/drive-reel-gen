-- Ajouter le champ cancel_at_period_end à user_subscriptions
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;