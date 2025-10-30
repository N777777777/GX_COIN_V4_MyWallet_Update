-- إنشاء جدول المهام التي ينشئها المستخدمون
CREATE TABLE public.user_created_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  creator_telegram_id BIGINT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_username TEXT NOT NULL,
  channel_id BIGINT,
  target_members INTEGER NOT NULL,
  current_participants INTEGER NOT NULL DEFAULT 0,
  reward_per_member NUMERIC NOT NULL DEFAULT 50,
  total_cost NUMERIC NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  bot_verified BOOLEAN NOT NULL DEFAULT false,
  published_to_channel BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول المشاركين في المهام
CREATE TABLE public.user_task_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.user_created_tasks(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL,
  participant_telegram_id BIGINT NOT NULL,
  participant_name TEXT,
  participant_username TEXT,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء فهرس فريد لمنع المشاركة المتكررة
CREATE UNIQUE INDEX idx_user_task_participants_unique 
ON public.user_task_participants(task_id, participant_telegram_id);

-- تمكين RLS
ALTER TABLE public.user_created_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_participants ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمهام
CREATE POLICY "Users can create their own tasks" 
ON public.user_created_tasks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view active tasks" 
ON public.user_created_tasks 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Creators can update their own tasks" 
ON public.user_created_tasks 
FOR UPDATE 
USING (creator_telegram_id IN (
  SELECT telegram_id FROM public.telegram_users WHERE id = auth.uid()
));

-- سياسات الأمان للمشاركين
CREATE POLICY "Users can join tasks" 
ON public.user_task_participants 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view task participants" 
ON public.user_task_participants 
FOR SELECT 
USING (true);

CREATE POLICY "System can update participants" 
ON public.user_task_participants 
FOR UPDATE 
USING (true);

-- trigger لتحديث updated_at
CREATE TRIGGER update_user_created_tasks_updated_at
BEFORE UPDATE ON public.user_created_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- دالة لإنهاء المهمة عند اكتمال العدد المطلوب
CREATE OR REPLACE FUNCTION public.check_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث عدد المشاركين الحالي
  UPDATE public.user_created_tasks 
  SET current_participants = (
    SELECT COUNT(*) 
    FROM public.user_task_participants 
    WHERE task_id = NEW.task_id
  )
  WHERE id = NEW.task_id;
  
  -- التحقق من اكتمال المهمة
  UPDATE public.user_created_tasks 
  SET 
    is_completed = true,
    is_active = false,
    completed_at = now()
  WHERE id = NEW.task_id 
  AND current_participants >= target_members
  AND is_completed = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ربط trigger مع جدول المشاركين
CREATE TRIGGER trigger_check_task_completion
AFTER INSERT ON public.user_task_participants
FOR EACH ROW
EXECUTE FUNCTION public.check_task_completion();