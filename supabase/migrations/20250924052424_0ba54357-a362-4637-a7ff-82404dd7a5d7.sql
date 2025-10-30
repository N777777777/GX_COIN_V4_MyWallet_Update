-- تفعيل التحديثات في الوقت الفعلي لجدول telegram_users
ALTER TABLE public.telegram_users REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_users;