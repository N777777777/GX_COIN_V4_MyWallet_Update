-- دالة لخصم مكافآت الإحالة من جميع المستخدمين
CREATE OR REPLACE FUNCTION public.deduct_referral_rewards()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
  total_deducted NUMERIC := 0;
  total_users INTEGER := 0;
  users_processed TEXT[] := '{}';
BEGIN
  -- خصم مكافآت الإحالة من المستخدمين
  FOR user_record IN 
    SELECT 
      telegram_id,
      first_name,
      username,
      total_referral_earnings,
      coins
    FROM public.telegram_users 
    WHERE total_referral_earnings > 0
  LOOP
    -- خصم مكافآت الإحالة من العملات
    UPDATE public.telegram_users 
    SET 
      coins = GREATEST(0, coins - total_referral_earnings),
      total_referral_earnings = 0,
      total_referrals_count = 0,
      referral_tier = 'bronze'
    WHERE telegram_id = user_record.telegram_id;
    
    total_deducted := total_deducted + user_record.total_referral_earnings;
    total_users := total_users + 1;
    
    users_processed := users_processed || 
      (user_record.first_name || ' (' || user_record.telegram_id || '): -' || user_record.total_referral_earnings || ' عملة');
  END LOOP;
  
  -- إعادة تعيين جميع مكافآت الإحالة في جدول user_referrals
  UPDATE public.user_referrals 
  SET reward_amount = 0, reward_claimed = false;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم خصم مكافآت الإحالة بنجاح',
    'total_users_affected', total_users,
    'total_amount_deducted', total_deducted,
    'users_processed', users_processed
  );
END;
$function$;

-- تنفيذ الدالة لخصم المكافآت
SELECT public.deduct_referral_rewards();