-- تحديث دالة معالجة الإحالات لتستخدم 10% بدلاً من مبلغ ثابت
CREATE OR REPLACE FUNCTION public.process_referral(referred_user_id uuid, referrer_telegram_id_param bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  referrer_user RECORD;
  referred_user RECORD;
  referral_reward INTEGER;
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
        -- حساب 10% من نقاط المستخدم المُحال
        referral_reward := FLOOR(COALESCE(referred_user.coins, 0) * 0.1);
        
        -- إضافة الإحالة
        INSERT INTO public.user_referrals (referrer_telegram_id, referred_telegram_id, reward_amount)
        VALUES (referrer_telegram_id_param, referred_user.telegram_id, referral_reward);
        
        -- إضافة النقاط للمُحيل
        UPDATE public.telegram_users 
        SET coins = coins + referral_reward
        WHERE telegram_id = referrer_telegram_id_param;
        
        -- تحديث معرف المُحيل للمستخدم الجديد
        UPDATE public.telegram_users 
        SET referrer_telegram_id = referrer_telegram_id_param
        WHERE id = referred_user_id;
        
        result := json_build_object(
          'success', true,
          'message', 'تم تسجيل الإحالة بنجاح',
          'reward_amount', referral_reward
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
$function$;