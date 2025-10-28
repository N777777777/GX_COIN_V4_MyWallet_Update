-- تحديث function handle_qualification_change لاستخدام جدول referrals بدلاً من user_referrals
CREATE OR REPLACE FUNCTION public.handle_qualification_change()
RETURNS TRIGGER
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
  
  -- البحث عن إحالات لم تُمنح مكافآتها بعد (استخدام جدول referrals)
  FOR referrer_record IN 
    SELECT * FROM public.referrals 
    WHERE referred_telegram_id = user_telegram_id 
    AND reward_claimed = false
  LOOP
    -- إعطاء 0.1 G COIN للمُحيل (حسب النظام الجديد)
    UPDATE public.telegram_users 
    SET bal_g4v7y = COALESCE(bal_g4v7y, 0) + 0.1
    WHERE telegram_id = referrer_record.referrer_telegram_id;
    
    -- تحديث حالة المكافأة في جدول الإحالات
    UPDATE public.referrals 
    SET 
      reward_gcoin = 0.1,
      reward_claimed = true,
      claimed_at = NOW()
    WHERE id = referrer_record.id;
    
    -- إرسال إشعار للمُحيل عبر البوت
    PERFORM
      net.http_post(
        url := 'https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/notify-referrer-reward',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'referrer_telegram_id', referrer_record.referrer_telegram_id,
          'referred_user_name', referred_user_name,
          'gcoin_reward', 0.1,
          'pepe_reward', 0,
          'alpha_reward', 0
        )::jsonb
      );
    
  END LOOP;
  
  RETURN NEW;
END;
$$;