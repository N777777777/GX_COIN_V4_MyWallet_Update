-- إنشاء جدول المهام المُنشأة من المستخدمين (الإعلانات)
CREATE TABLE public.user_created_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID NOT NULL,
    creator_telegram_id BIGINT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('join_channel', 'interact_post', 'comment_post', 'repost')),
    channel_or_post_link TEXT NOT NULL,
    required_participants INTEGER NOT NULL DEFAULT 1,
    reward_per_person NUMERIC NOT NULL DEFAULT 0.03,
    total_budget NUMERIC NOT NULL,
    current_participants INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- إنشاء جدول المشاركين في المهام المُنشأة
CREATE TABLE public.user_task_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.user_created_tasks(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL,
    participant_telegram_id BIGINT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reward_claimed BOOLEAN NOT NULL DEFAULT false,
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    submission_data JSONB
);

-- تفعيل RLS
ALTER TABLE public.user_created_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_participants ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS للمهام المُنشأة
CREATE POLICY "Anyone can view active user created tasks" 
ON public.user_created_tasks 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can create their own tasks" 
ON public.user_created_tasks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own tasks" 
ON public.user_created_tasks 
FOR UPDATE 
USING (true);

-- إنشاء سياسات RLS للمشاركين
CREATE POLICY "Anyone can view task participants" 
ON public.user_task_participants 
FOR SELECT 
USING (true);

CREATE POLICY "Users can participate in tasks" 
ON public.user_task_participants 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own participation" 
ON public.user_task_participants 
FOR UPDATE 
USING (true);

-- إنشاء فهارس لتحسين الأداء
CREATE INDEX idx_user_created_tasks_creator ON public.user_created_tasks(creator_telegram_id);
CREATE INDEX idx_user_created_tasks_status ON public.user_created_tasks(status);
CREATE INDEX idx_user_task_participants_task ON public.user_task_participants(task_id);
CREATE INDEX idx_user_task_participants_participant ON public.user_task_participants(participant_telegram_id);

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_user_created_tasks_updated_at
BEFORE UPDATE ON public.user_created_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();