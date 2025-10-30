-- إضافة unique constraints لمنع التقديم المتكرر للمهام

-- إضافة unique constraint لجدول pending_tasks لمنع تقديم نفس المهمة أكثر من مرة
ALTER TABLE public.pending_tasks 
ADD CONSTRAINT unique_pending_task_per_user 
UNIQUE (telegram_user_id, task_id);

-- إضافة unique constraint لجدول completed_tasks لمنع إكمال نفس المهمة أكثر من مرة  
ALTER TABLE public.completed_tasks 
ADD CONSTRAINT unique_completed_task_per_user 
UNIQUE (telegram_user_id, task_id);

-- تحديث دالة move_task_to_completed لتتعامل مع الـ unique constraint
CREATE OR REPLACE FUNCTION public.move_task_to_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق من أن الحالة تغيرت إلى approved أو completed
  IF NEW.status IN ('approved', 'completed') AND OLD.status != NEW.status THEN
    
    -- تسجيل الحدث
    RAISE NOTICE 'Moving task % from pending to completed for user %', NEW.task_id, NEW.telegram_user_id;
    
    -- إدراج المهمة في جدول المهام المكتملة مع ON CONFLICT للتعامل مع الـ unique constraint
    INSERT INTO public.completed_tasks (
      telegram_user_id,
      task_id,
      task_title,
      task_type,
      reward_amount,
      uid,
      campaign_link,
      completed_at
    ) VALUES (
      NEW.telegram_user_id,
      NEW.task_id,
      NEW.task_title,
      'platform',
      10,
      NEW.uid,
      NEW.campaign_link,
      COALESCE(NEW.reviewed_at, NOW())
    )
    ON CONFLICT (telegram_user_id, task_id) DO UPDATE SET
      task_title = EXCLUDED.task_title,
      reward_amount = EXCLUDED.reward_amount,
      completed_at = EXCLUDED.completed_at;
    
    RAISE NOTICE 'Task % inserted into completed_tasks', NEW.task_id;
    
    -- إضافة 10 نقاط للمستخدم
    UPDATE public.telegram_users 
    SET coins = coins + 10
    WHERE id = NEW.telegram_user_id;
    
    RAISE NOTICE 'Added 10 coins to user %', NEW.telegram_user_id;
    
    -- حذف المهمة من جدول المهام المعلقة
    DELETE FROM public.pending_tasks WHERE id = NEW.id;
    
    RAISE NOTICE 'Deleted pending task %', NEW.id;
    
    -- منع تحديث السجل الأصلي لأنه تم حذفه
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;