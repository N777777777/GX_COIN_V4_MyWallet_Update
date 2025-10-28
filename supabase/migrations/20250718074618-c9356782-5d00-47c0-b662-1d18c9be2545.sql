-- تفعيل الـ realtime للجدول
ALTER TABLE public.uid_submissions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uid_submissions;