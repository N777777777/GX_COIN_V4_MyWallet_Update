-- تفعيل realtime على جدول المهام المكتملة
ALTER TABLE public.completed_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.completed_tasks;

-- تفعيل realtime على جدول المهام المعلقة
ALTER TABLE public.pending_tasks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_tasks;