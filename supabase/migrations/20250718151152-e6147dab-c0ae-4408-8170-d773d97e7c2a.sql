-- تحديث قيد التحقق للسماح بالحالات الجديدة
ALTER TABLE public.pending_tasks 
DROP CONSTRAINT pending_tasks_status_check;

-- إضافة قيد جديد يسمح بجميع الحالات المطلوبة
ALTER TABLE public.pending_tasks 
ADD CONSTRAINT pending_tasks_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'rejected'::text, 'approved'::text, 'completed'::text]));