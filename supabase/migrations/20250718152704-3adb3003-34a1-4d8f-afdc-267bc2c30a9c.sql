-- إزالة التريجر الحالي
DROP TRIGGER IF EXISTS move_approved_tasks_to_completed ON public.pending_tasks;

-- تحديث دالة نقل المهام المكتملة مع إصلاح المشاكل
CREATE OR REPLACE FUNCTION public.move_task_to_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- التحقق من أن الحالة تغيرت إلى approved أو completed
  IF NEW.status IN ('approved', 'completed') AND OLD.status != NEW.status THEN
    
    -- إدراج المهمة في جدول المهام المكتملة
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
      10, -- المكافأة الثابتة 10 نقاط
      NEW.uid,
      NEW.campaign_link,
      COALESCE(NEW.reviewed_at, NOW())
    )
    ON CONFLICT (telegram_user_id, task_id) DO UPDATE SET
      task_title = EXCLUDED.task_title,
      reward_amount = EXCLUDED.reward_amount,
      completed_at = EXCLUDED.completed_at;
    
    -- إضافة 10 نقاط فقط للمستخدم
    UPDATE public.telegram_users 
    SET coins = coins + 10
    WHERE id = NEW.telegram_user_id;
    
    -- حذف المهمة من جدول المهام المعلقة
    DELETE FROM public.pending_tasks WHERE id = NEW.id;
    
    -- منع تحديث السجل الأصلي لأنه تم حذفه
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إعادة إنشاء التريجر
CREATE TRIGGER move_approved_tasks_to_completed
  AFTER UPDATE ON public.pending_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.move_task_to_completed();