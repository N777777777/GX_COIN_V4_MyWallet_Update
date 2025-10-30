-- تعديل نوع البيانات في جدول completed_tasks لدعم الأرقام العشرية
ALTER TABLE public.completed_tasks 
ALTER COLUMN reward_amount TYPE numeric USING reward_amount::numeric;

-- تحديث القيمة الافتراضية أيضاً
ALTER TABLE public.completed_tasks 
ALTER COLUMN reward_amount SET DEFAULT 0.03;