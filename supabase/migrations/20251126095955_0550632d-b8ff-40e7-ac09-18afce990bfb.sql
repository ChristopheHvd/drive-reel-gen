-- Enable realtime for user_subscriptions table
ALTER TABLE public.user_subscriptions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;