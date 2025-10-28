-- تحديث قيود الحالة في جدول uid_submissions
ALTER TABLE public.uid_submissions 
DROP CONSTRAINT uid_submissions_status_check;

ALTER TABLE public.uid_submissions 
ADD CONSTRAINT uid_submissions_status_check 
CHECK (status IN ('pending', 'completed', 'failed'));