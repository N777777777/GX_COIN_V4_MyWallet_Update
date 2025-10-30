-- إنشاء function جديدة للتحقق من حالة التأهيل
CREATE OR REPLACE FUNCTION public.is_user_qualified(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_completed_kucoin BOOLEAN := FALSE;
  has_daily_login BOOLEAN := FALSE;
  has_ton_purchase BOOLEAN := FALSE;
BEGIN
  -- التحقق من إكمال مهمة KuCoin
  SELECT EXISTS (
    SELECT 1 FROM public.completed_tasks 
    WHERE telegram_user_id = user_id AND task_id = '6'
  ) INTO has_completed_kucoin;
  
  -- التحقق من الدخول اليومي
  SELECT EXISTS (
    SELECT 1 FROM public.daily_logins 
    WHERE telegram_user_id = user_id
  ) INTO has_daily_login;
  
  -- التحقق من شراء TON
  SELECT EXISTS (
    SELECT 1 FROM public.ton_purchases 
    WHERE telegram_user_id = user_id AND verified = true
  ) INTO has_ton_purchase;
  
  RETURN has_completed_kucoin OR has_daily_login OR has_ton_purchase;
END;
$$;

-- تحديث function process_referral لتعطي 2 عملة فقط للمؤهلين
CREATE OR REPLACE FUNCTION public.process_referral(referred_user_id uuid, referrer_telegram_id_param bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_user RECORD;
  referred_user RECORD;
  referral_reward INTEGER := 0;
  is_referred_qualified BOOLEAN := FALSE;
  result JSON;
BEGIN
  -- التحقق من وجود المُحيل
  SELECT * INTO referrer_user 
  FROM public.telegram_users 
  WHERE telegram_id = referrer_telegram_id_param;
  
  IF referrer_user IS NULL THEN
    result := json_build_object(
      'success', false,
      'message', 'المُحيل غير موجود'
    );
  ELSE
    -- الحصول على بيانات المستخدم المُحال
    SELECT * INTO referred_user 
    FROM public.telegram_users 
    WHERE id = referred_user_id;
    
    IF referred_user IS NULL THEN
      result := json_build_object(
        'success', false,
        'message', 'المستخدم المُحال غير موجود'
      );
    ELSE
      -- التحقق أن المستخدم لم يُسجل إحالة من قبل
      IF NOT EXISTS (
        SELECT 1 FROM public.user_referrals 
        WHERE referred_telegram_id = referred_user.telegram_id
      ) THEN
        
        -- التحقق من تأهيل المستخدم المُحال
        SELECT public.is_user_qualified(referred_user_id) INTO is_referred_qualified;
        
        -- إعطاء 2 عملة فقط إذا كان المُحال مؤهلاً
        IF is_referred_qualified THEN
          referral_reward := 2;
        ELSE
          referral_reward := 0;
        END IF;
        
        -- إضافة الإحالة
        INSERT INTO public.user_referrals (referrer_telegram_id, referred_telegram_id, reward_amount)
        VALUES (referrer_telegram_id_param, referred_user.telegram_id, referral_reward);
        
        -- إضافة النقاط للمُحيل إذا كان هناك مكافأة
        IF referral_reward > 0 THEN
          UPDATE public.telegram_users 
          SET coins = coins + referral_reward
          WHERE telegram_id = referrer_telegram_id_param;
        END IF;
        
        -- تحديث معرف المُحيل للمستخدم الجديد
        UPDATE public.telegram_users 
        SET referrer_telegram_id = referrer_telegram_id_param
        WHERE id = referred_user_id;
        
        result := json_build_object(
          'success', true,
          'message', CASE 
            WHEN is_referred_qualified THEN 'تم تسجيل الإحالة بنجاح وحصلت على 2 عملة'
            ELSE 'تم تسجيل الإحالة، ستحصل على 2 عملة عندما يصبح المُحال مؤهلاً'
          END,
          'reward_amount', referral_reward,
          'is_qualified', is_referred_qualified
        );
      ELSE
        result := json_build_object(
          'success', false,
          'message', 'تم تسجيل إحالة لهذا المستخدم من قبل'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN result;
END;
$$;

-- إنشاء function لمراقبة تغيير حالة التأهيل وإعطاء مكافآت الإحالة المعلقة
CREATE OR REPLACE FUNCTION public.handle_qualification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_telegram_id BIGINT;
  referrer_record RECORD;
BEGIN
  -- الحصول على telegram_id للمستخدم
  SELECT telegram_id INTO user_telegram_id 
  FROM public.telegram_users 
  WHERE id = NEW.telegram_user_id;
  
  -- البحث عن إحالات لم تُمنح مكافآتها بعد
  FOR referrer_record IN 
    SELECT * FROM public.user_referrals 
    WHERE referred_telegram_id = user_telegram_id 
    AND reward_amount = 0
  LOOP
    -- إعطاء 2 عملة للمُحيل
    UPDATE public.telegram_users 
    SET coins = coins + 2
    WHERE telegram_id = referrer_record.referrer_telegram_id;
    
    -- تحديث مبلغ المكافأة في جدول الإحالات
    UPDATE public.user_referrals 
    SET reward_amount = 2, reward_claimed = true
    WHERE id = referrer_record.id;
    
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- إنشاء trigger عند إكمال المهام
CREATE OR REPLACE TRIGGER on_task_completed
  AFTER INSERT ON public.completed_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_qualification_change();

-- إنشاء trigger عند الدخول اليومي
CREATE OR REPLACE TRIGGER on_daily_login
  AFTER INSERT ON public.daily_logins
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_qualification_change();

-- إنشاء trigger عند شراء TON
CREATE OR REPLACE TRIGGER on_ton_purchase_verified
  AFTER UPDATE ON public.ton_purchases
  FOR EACH ROW
  WHEN (NEW.verified = true AND OLD.verified = false)
  EXECUTE FUNCTION public.handle_qualification_change();