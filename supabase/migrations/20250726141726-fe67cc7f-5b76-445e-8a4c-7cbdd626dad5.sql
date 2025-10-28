-- إنشاء دالة لإعادة تعيين المهام للمستخدمين
CREATE OR REPLACE FUNCTION public.reset_user_task(user_telegram_id BIGINT, task_id_param TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  old_attempts INTEGER := 0;
  result JSON;
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
  
  -- الحصول على عدد المحاولات السابقة
  SELECT COALESCE(MAX(attempt_number), 0) INTO old_attempts
  FROM public.completed_tasks 
  WHERE telegram_user_id = user_record.id 
  AND task_id = task_id_param;
  
  -- تحديث المحاولات السابقة لتكون غير نشطة
  UPDATE public.completed_tasks 
  SET is_latest_attempt = false
  WHERE telegram_user_id = user_record.id 
  AND task_id = task_id_param;
  
  -- حذف المهام المعلقة للسماح بإرسال جديد
  DELETE FROM public.pending_tasks 
  WHERE telegram_user_id = user_record.id 
  AND task_id = task_id_param;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم إعادة تعيين المهمة بنجاح',
    'previous_attempts', old_attempts,
    'can_retry', true
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء إعادة تعيين المهمة: ' || SQLERRM
    );
END;
$$;

-- إنشاء دالة لإعادة تعيين جميع المهام للمستخدم
CREATE OR REPLACE FUNCTION public.reset_all_user_tasks(user_telegram_id BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  tasks_count INTEGER := 0;
  result JSON;
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
  
  -- عد المهام المكتملة
  SELECT COUNT(*) INTO tasks_count
  FROM public.completed_tasks 
  WHERE telegram_user_id = user_record.id 
  AND is_latest_attempt = true;
  
  -- تحديث جميع المحاولات لتكون غير نشطة
  UPDATE public.completed_tasks 
  SET is_latest_attempt = false
  WHERE telegram_user_id = user_record.id;
  
  -- حذف جميع المهام المعلقة
  DELETE FROM public.pending_tasks 
  WHERE telegram_user_id = user_record.id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم إعادة تعيين جميع المهام بنجاح',
    'reset_tasks_count', tasks_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء إعادة تعيين المهام: ' || SQLERRM
    );
END;
$$;

-- تعديل دالة التحقق من إكمال المهام للسماح بإعادة الإكمال
CREATE OR REPLACE FUNCTION public.can_complete_task(user_telegram_id BIGINT, task_id_param TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  has_latest_completion BOOLEAN := false;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = user_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- التحقق من وجود إكمال نشط حديث
  SELECT EXISTS (
    SELECT 1 FROM public.completed_tasks 
    WHERE telegram_user_id = user_record.id 
    AND task_id = task_id_param
    AND is_latest_attempt = true
  ) INTO has_latest_completion;
  
  -- يمكن إكمال المهمة إذا لم تكن مكتملة حديثاً
  RETURN NOT has_latest_completion;
END;
$$;