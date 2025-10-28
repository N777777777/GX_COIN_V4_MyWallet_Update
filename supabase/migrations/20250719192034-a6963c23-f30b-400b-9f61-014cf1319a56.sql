-- حذف مهمة "اشترك في القناة" العامة
DELETE FROM public.default_tasks 
WHERE task_id = 'telegram_channel_subscription';