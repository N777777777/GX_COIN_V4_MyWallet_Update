-- إضافة عمود referrer_id إلى جدول telegram_users
ALTER TABLE public.telegram_users 
ADD COLUMN referrer_telegram_id BIGINT DEFAULT NULL;

-- إنشاء دالة للتحقق من الإحالة وإضافة النقاط
CREATE OR REPLACE FUNCTION public.process_referral(referred_user_id UUID, referrer_telegram_id_param BIGINT)
RETURNS JSON AS $$
DECLARE
  referrer_user RECORD;
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
    -- إضافة الإحالة
    INSERT INTO public.user_referrals (referrer_telegram_id, referred_telegram_id, reward_amount)
    VALUES (referrer_telegram_id_param, (SELECT telegram_id FROM telegram_users WHERE id = referred_user_id), 1000);
    
    -- إضافة النقاط للمُحيل
    UPDATE public.telegram_users 
    SET coins = coins + 1000
    WHERE telegram_id = referrer_telegram_id_param;
    
    -- تحديث معرف المُحيل للمستخدم الجديد
    UPDATE public.telegram_users 
    SET referrer_telegram_id = referrer_telegram_id_param
    WHERE id = referred_user_id;
    
    result := json_build_object(
      'success', true,
      'message', 'تم تسجيل الإحالة بنجاح',
      'reward_amount', 1000
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;