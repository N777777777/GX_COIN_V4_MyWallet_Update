-- إنشاء جدول مهام الشركاء
CREATE TABLE public.partner_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  reward_amount NUMERIC NOT NULL DEFAULT 10,
  task_url TEXT,
  requirements JSONB,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES telegram_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  task_type TEXT DEFAULT 'partner' NOT NULL,
  partner_name TEXT,
  partner_logo_url TEXT
);

-- تمكين RLS
ALTER TABLE public.partner_tasks ENABLE ROW LEVEL SECURITY;

-- سياسات RLS
CREATE POLICY "Anyone can view active partner tasks" 
ON public.partner_tasks 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can create partner tasks" 
ON public.partner_tasks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Creators can update their partner tasks" 
ON public.partner_tasks 
FOR UPDATE 
USING (created_by = (SELECT id FROM telegram_users WHERE telegram_id = auth.uid()));

-- إنشاء جدول إشعارات المهام
CREATE TABLE public.task_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES partner_tasks(id) ON DELETE CASCADE,
  telegram_user_id UUID REFERENCES telegram_users(id),
  telegram_id BIGINT NOT NULL,
  notification_type TEXT DEFAULT 'new_task',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين RLS للإشعارات
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للإشعارات
CREATE POLICY "Users can view their own notifications" 
ON public.task_notifications 
FOR SELECT 
USING (telegram_user_id = (SELECT id FROM telegram_users WHERE telegram_id = auth.uid()));

CREATE POLICY "Users can update their own notifications" 
ON public.task_notifications 
FOR UPDATE 
USING (telegram_user_id = (SELECT id FROM telegram_users WHERE telegram_id = auth.uid()));

-- دالة لإنشاء إشعارات للجميع عند إنشاء مهمة شريك جديدة
CREATE OR REPLACE FUNCTION public.create_partner_task_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- إنشاء عنوان ورسالة الإشعار
  notification_title := '🎯 مهمة شريك جديدة: ' || NEW.title;
  notification_message := 'مهمة جديدة متاحة الآن! اربح ' || NEW.reward_amount || ' عملة بإكمال: ' || NEW.title;
  
  -- إرسال إشعار لجميع المستخدمين النشطين
  FOR user_record IN 
    SELECT id, telegram_id 
    FROM public.telegram_users 
    WHERE is_blocked = false OR is_blocked IS NULL
  LOOP
    INSERT INTO public.task_notifications (
      task_id,
      telegram_user_id,
      telegram_id,
      notification_type,
      title,
      message
    ) VALUES (
      NEW.id,
      user_record.id,
      user_record.telegram_id,
      'new_partner_task',
      notification_title,
      notification_message
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- إنشاء المُشغل (Trigger)
CREATE TRIGGER create_partner_task_notifications_trigger
  AFTER INSERT ON public.partner_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_partner_task_notifications();

-- دالة لإنشاء مهمة شريك جديدة
CREATE OR REPLACE FUNCTION public.create_partner_task(
  creator_telegram_id BIGINT,
  task_title TEXT,
  task_description TEXT DEFAULT NULL,
  reward_amount NUMERIC DEFAULT 10,
  task_url TEXT DEFAULT NULL,
  max_participants INTEGER DEFAULT NULL,
  end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  partner_name TEXT DEFAULT NULL,
  partner_logo_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  creator_record RECORD;
  new_task_id UUID;
  result JSON;
BEGIN
  -- البحث عن المنشئ
  SELECT * INTO creator_record 
  FROM public.telegram_users 
  WHERE telegram_id = creator_telegram_id;
  
  IF creator_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- إنشاء المهمة
  INSERT INTO public.partner_tasks (
    title,
    description,
    reward_amount,
    task_url,
    max_participants,
    end_date,
    created_by,
    partner_name,
    partner_logo_url
  ) VALUES (
    task_title,
    task_description,
    reward_amount,
    task_url,
    max_participants,
    end_date,
    creator_record.id,
    partner_name,
    partner_logo_url
  ) RETURNING id INTO new_task_id;
  
  RETURN json_build_object(
    'success', true,
    'task_id', new_task_id,
    'message', 'تم إنشاء المهمة ونشرها بنجاح'
  );
END;
$$;

-- دالة للحصول على الإشعارات غير المقروءة
CREATE OR REPLACE FUNCTION public.get_unread_notifications(user_telegram_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  notifications_array JSON[];
  notification_record RECORD;
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
  
  -- جمع الإشعارات غير المقروءة
  notifications_array := '{}';
  FOR notification_record IN 
    SELECT 
      tn.*,
      pt.title as task_title,
      pt.reward_amount
    FROM public.task_notifications tn
    LEFT JOIN public.partner_tasks pt ON tn.task_id = pt.id
    WHERE tn.telegram_user_id = user_record.id 
    AND tn.is_read = false
    ORDER BY tn.created_at DESC
    LIMIT 50
  LOOP
    notifications_array := notifications_array || json_build_object(
      'id', notification_record.id,
      'task_id', notification_record.task_id,
      'notification_type', notification_record.notification_type,
      'title', notification_record.title,
      'message', notification_record.message,
      'task_title', notification_record.task_title,
      'reward_amount', notification_record.reward_amount,
      'sent_at', notification_record.sent_at
    );
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'notifications', notifications_array,
    'count', array_length(notifications_array, 1)
  );
END;
$$;

-- دالة لتحديد الإشعارات كمقروءة
CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(
  user_telegram_id BIGINT,
  notification_ids UUID[] DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  updated_count INTEGER;
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
  
  -- تحديث الإشعارات
  IF notification_ids IS NULL THEN
    -- تحديد جميع الإشعارات كمقروءة
    UPDATE public.task_notifications 
    SET is_read = true
    WHERE telegram_user_id = user_record.id AND is_read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    -- تحديد إشعارات محددة كمقروءة
    UPDATE public.task_notifications 
    SET is_read = true
    WHERE telegram_user_id = user_record.id 
    AND id = ANY(notification_ids)
    AND is_read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'updated_count', updated_count,
    'message', 'تم تحديث الإشعارات بنجاح'
  );
END;
$$;

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX idx_task_notifications_user_read ON public.task_notifications(telegram_user_id, is_read);
CREATE INDEX idx_partner_tasks_active ON public.partner_tasks(is_active, created_at);
CREATE INDEX idx_task_notifications_created ON public.task_notifications(created_at DESC);

-- دالة للحصول على جميع مهام الشركاء النشطة
CREATE OR REPLACE FUNCTION public.get_active_partner_tasks()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tasks_array JSON[];
  task_record RECORD;
BEGIN
  tasks_array := '{}';
  
  FOR task_record IN 
    SELECT 
      pt.*,
      tu.first_name as creator_name,
      tu.username as creator_username
    FROM public.partner_tasks pt
    LEFT JOIN public.telegram_users tu ON pt.created_by = tu.id
    WHERE pt.is_active = true 
    AND (pt.end_date IS NULL OR pt.end_date > now())
    ORDER BY pt.created_at DESC
  LOOP
    tasks_array := tasks_array || json_build_object(
      'id', task_record.id,
      'title', task_record.title,
      'description', task_record.description,
      'reward_amount', task_record.reward_amount,
      'task_url', task_record.task_url,
      'max_participants', task_record.max_participants,
      'current_participants', task_record.current_participants,
      'start_date', task_record.start_date,
      'end_date', task_record.end_date,
      'partner_name', task_record.partner_name,
      'partner_logo_url', task_record.partner_logo_url,
      'creator_name', task_record.creator_name,
      'created_at', task_record.created_at
    );
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'tasks', tasks_array,
    'count', array_length(tasks_array, 1)
  );
END;
$$;