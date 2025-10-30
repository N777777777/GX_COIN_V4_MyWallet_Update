-- تحديث دالة handle_qualification_change لإرسال إشعار في البوت عند منح المكافأة
CREATE OR REPLACE FUNCTION public.handle_qualification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_telegram_id BIGINT;
  referrer_record RECORD;
  referred_user_name TEXT;
BEGIN
  -- الحصول على telegram_id و الاسم للمستخدم
  SELECT telegram_id, first_name INTO user_telegram_id, referred_user_name
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
    
    -- إرسال إشعار للمُحيل عبر البوت
    PERFORM
      net.http_post(
        url := 'https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/notify-referrer-reward',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'referrer_telegram_id', referrer_record.referrer_telegram_id,
          'referred_user_name', referred_user_name,
          'gcoin_reward', 2,
          'pepe_reward', 0,
          'alpha_reward', 0
        )::jsonb
      );
    
  END LOOP;
  
  RETURN NEW;
END;
$$;