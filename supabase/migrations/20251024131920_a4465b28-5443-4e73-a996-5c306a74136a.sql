-- دالة لجلب عمولة الإحالة الخاصة بالمستخدم
CREATE OR REPLACE FUNCTION public.get_user_referral_commission(p_telegram_id BIGINT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  commission_rate NUMERIC;
BEGIN
  SELECT COALESCE(gcoin_referral_commission_rate, 0.1) 
  INTO commission_rate
  FROM public.telegram_users
  WHERE telegram_id = p_telegram_id;
  
  RETURN COALESCE(commission_rate, 0.1);
END;
$$;