-- إزالة القيد الفريد من جدول completed_tasks للسماح بإعادة إكمال المهام
-- والاحتفاظ بسجل تاريخي لكل إكمال

-- إضافة عمود لتتبع رقم المحاولة
ALTER TABLE public.completed_tasks 
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1;

-- إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_completed_tasks_user_task_attempt 
ON public.completed_tasks(telegram_user_id, task_id, attempt_number);

-- إضافة عمود لتحديد ما إذا كانت هذه أحدث محاولة
ALTER TABLE public.completed_tasks 
ADD COLUMN IF NOT EXISTS is_latest_attempt BOOLEAN DEFAULT true;

-- تحديث السجلات الموجودة لتكون أحدث محاولة
UPDATE public.completed_tasks 
SET is_latest_attempt = true, attempt_number = 1 
WHERE attempt_number IS NULL;