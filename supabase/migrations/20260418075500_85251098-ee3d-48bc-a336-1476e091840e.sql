ALTER TABLE public.storms REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.storms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;