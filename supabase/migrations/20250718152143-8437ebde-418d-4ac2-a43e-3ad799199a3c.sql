-- إزالة التريجر الحالي وإعادة إنشاؤه مع تحسينات
DROP TRIGGER IF EXISTS move_approved_tasks_to_completed ON public.pending_tasks;

-- تحديث دالة نقل المهام المكتملة
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
      'platform', -- مهام الـ UID عادة ما تكون مهام منصات
      CASE 
        WHEN NEW.task_title = 'KUCOIN' THEN 2500
        WHEN NEW.task_title LIKE '%5 أصدقاء%' THEN 1000
        WHEN NEW.task_title LIKE '%شارك%' THEN 500
        WHEN NEW.task_title LIKE '%تليجرام%' THEN 300
        ELSE 10 -- المكافأة الافتراضية
      END,
      NEW.uid,
      NEW.campaign_link,
      COALESCE(NEW.reviewed_at, NOW())
    )
    ON CONFLICT (telegram_user_id, task_id) DO UPDATE SET
      task_title = EXCLUDED.task_title,
      reward_amount = EXCLUDED.reward_amount,
      completed_at = EXCLUDED.completed_at;
    
    -- إضافة النقاط للمستخدم
    UPDATE public.telegram_users 
    SET coins = coins + CASE 
      WHEN NEW.task_title = 'KUCOIN' THEN 2500
      WHEN NEW.task_title LIKE '%5 أصدقاء%' THEN 1000
      WHEN NEW.task_title LIKE '%شارك%' THEN 500
      WHEN NEW.task_title LIKE '%تليجرام%' THEN 300
      ELSE 10
    END
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