-- إضافة عمود رصيد TON للمستخدمين
ALTER TABLE public.telegram_users 
ADD COLUMN ton_balance NUMERIC DEFAULT 0;

-- إضافة جدول لتتبع عمليات السحب
CREATE TABLE IF NOT EXISTS public.ton_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID NOT NULL,
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
  transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- تفعيل RLS
ALTER TABLE public.ton_withdrawals ENABLE ROW LEVEL SECURITY;

-- إنشاء policies للسحب
CREATE POLICY "Users can view their own withdrawals" 
ON public.ton_withdrawals 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create withdrawal requests" 
ON public.ton_withdrawals 
FOR INSERT 
WITH CHECK (true);

-- تحديث وظيفة نقل المهام المكتملة لإضافة TON لمهام KuCoin
CREATE OR REPLACE FUNCTION public.move_task_to_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- التحقق من أن الحالة تغيرت إلى approved أو completed
  IF NEW.status IN ('approved', 'completed') AND OLD.status != NEW.status THEN
    
    -- تسجيل الحدث
    RAISE NOTICE 'Moving task % from pending to completed for user %', NEW.task_id, NEW.telegram_user_id;
    
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
    
    -- إضافة TON للمهام المؤهلة (مهام KuCoin)
    IF NEW.task_id = 'kucoin_task' THEN
      UPDATE public.telegram_users 
      SET ton_balance = ton_balance + 0.64
      WHERE id = NEW.telegram_user_id;
      
      RAISE NOTICE 'Added 0.64 TON to user % for KuCoin task completion', NEW.telegram_user_id;
    END IF;
    
    RAISE NOTICE 'Added 10 coins to user %', NEW.telegram_user_id;
    
    -- حذف المهمة من جدول المهام المعلقة
    DELETE FROM public.pending_tasks WHERE id = NEW.id;
    
    RAISE NOTICE 'Deleted pending task %', NEW.id;
    
    -- منع تحديث السجل الأصلي لأنه تم حذفه
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;