-- حذف الـ constraints المكررة للتنظيف

-- حذف الـ constraint المكرر من جدول pending_tasks
ALTER TABLE public.pending_tasks 
DROP CONSTRAINT IF EXISTS pending_tasks_telegram_user_id_task_id_key;

-- حذف الـ constraint المكرر من جدول completed_tasks  
ALTER TABLE public.completed_tasks 
DROP CONSTRAINT IF EXISTS completed_tasks_telegram_user_id_task_id_key;

-- التأكد من وجود الـ constraints الصحيحة فقط
-- (الـ constraints الأساسية: unique_pending_task_per_user و unique_completed_task_per_user)

-- إضافة index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_pending_tasks_user_task 
ON public.pending_tasks(telegram_user_id, task_id);

CREATE INDEX IF NOT EXISTS idx_completed_tasks_user_task 
ON public.completed_tasks(telegram_user_id, task_id);