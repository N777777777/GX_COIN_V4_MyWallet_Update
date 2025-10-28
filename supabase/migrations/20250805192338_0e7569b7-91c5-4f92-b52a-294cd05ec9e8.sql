-- إضافة مهمة التأهيل TimeWall.io الجديدة
INSERT INTO public.default_tasks (
  task_id,
  title,
  description,
  task_type,
  reward_amount,
  requirements,
  is_active
) VALUES (
  'timewall_qualification',
  'مهمة التأهيل TimeWall.io',
  'اجمع 10 عملات من TimeWall.io للحصول على التأهيل',
  'qualification_task',
  0, -- لا توجد مكافأة عملات، المكافأة هي التأهيل
  json_build_object(
    'required_coins', 10,
    'source', 'timewall',
    'action', 'collect_coins',
    'description', 'اجمع 10 عملات من TimeWall.io للحصول على التأهيل'
  ),
  true
);

-- إنشاء جدول لتتبع تقدم مهمة التأهيل TimeWall.io
CREATE TABLE IF NOT EXISTS public.timewall_qualification_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id UUID NOT NULL,
  telegram_id BIGINT NOT NULL,
  current_coins NUMERIC NOT NULL DEFAULT 0,
  target_coins NUMERIC NOT NULL DEFAULT 10,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(telegram_user_id)
);

-- تفعيل RLS للجدول الجديد
ALTER TABLE public.timewall_qualification_progress ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للجدول الجديد
CREATE POLICY "Users can view their own qualification progress"
ON public.timewall_qualification_progress
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own qualification progress"
ON public.timewall_qualification_progress
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own qualification progress"
ON public.timewall_qualification_progress
FOR UPDATE
USING (true);

-- دالة لتحديث تقدم التأهيل عند استلام عملات من TimeWall.io
CREATE OR REPLACE FUNCTION public.update_timewall_qualification_progress(
  user_telegram_id BIGINT,
  coins_received NUMERIC
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  progress_record RECORD;
  new_total NUMERIC;
  qualification_achieved BOOLEAN := FALSE;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = user_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- الحصول على التقدم الحالي أو إنشاؤه
  SELECT * INTO progress_record
  FROM public.timewall_qualification_progress
  WHERE telegram_user_id = user_record.id;
  
  IF progress_record IS NULL THEN
    -- إنشاء سجل جديد
    INSERT INTO public.timewall_qualification_progress (
      telegram_user_id,
      telegram_id,
      current_coins
    ) VALUES (
      user_record.id,
      user_telegram_id,
      coins_received
    ) RETURNING * INTO progress_record;
    
    new_total := coins_received;
  ELSE
    -- تحديث السجل الموجود
    new_total := progress_record.current_coins + coins_received;
    
    UPDATE public.timewall_qualification_progress
    SET 
      current_coins = new_total,
      updated_at = now()
    WHERE id = progress_record.id;
  END IF;
  
  -- التحقق من إكمال المهمة
  IF new_total >= 10 AND NOT COALESCE(progress_record.is_completed, FALSE) THEN
    qualification_achieved := TRUE;
    
    -- تحديث حالة الإكمال
    UPDATE public.timewall_qualification_progress
    SET 
      is_completed = true,
      completed_at = now(),
      updated_at = now()
    WHERE telegram_user_id = user_record.id;
    
    -- إضافة المستخدم للمؤهلين يدوياً
    INSERT INTO public.manual_qualified_users (
      telegram_user_id,
      telegram_id,
      first_name,
      username,
      qualification_reason
    ) VALUES (
      user_record.id,
      user_record.telegram_id,
      user_record.first_name,
      user_record.username,
      'إكمال مهمة التأهيل TimeWall.io'
    )
    ON CONFLICT (telegram_id) DO NOTHING;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'current_coins', new_total,
    'target_coins', 10,
    'qualification_achieved', qualification_achieved,
    'progress_percentage', (new_total / 10.0) * 100
  );
END;
$$;