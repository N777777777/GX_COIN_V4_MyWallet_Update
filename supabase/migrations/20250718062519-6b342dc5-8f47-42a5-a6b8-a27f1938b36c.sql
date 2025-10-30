-- إنشاء جدول لحفظ UIDs المقدمة
CREATE TABLE public.uid_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID REFERENCES public.telegram_users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  task_title TEXT NOT NULL,
  uid TEXT NOT NULL,
  campaign_link TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين Row Level Security
ALTER TABLE public.uid_submissions ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Users can view their own submissions" 
ON public.uid_submissions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own submissions" 
ON public.uid_submissions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own submissions" 
ON public.uid_submissions 
FOR UPDATE 
USING (true);

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_uid_submissions_updated_at
BEFORE UPDATE ON public.uid_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();