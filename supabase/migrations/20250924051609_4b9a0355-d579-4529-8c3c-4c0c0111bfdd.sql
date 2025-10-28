-- إنشاء دالة لتحديث رصيد G COIN V4 للمستخدم
CREATE OR REPLACE FUNCTION public.update_gcoin_v4_balance(
  p_telegram_user_id UUID,
  p_amount NUMERIC
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE id = p_telegram_user_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- تحديث رصيد G COIN V4
  UPDATE public.telegram_users 
  SET gcoin_v4_balance = COALESCE(gcoin_v4_balance, 0) + p_amount,
      updated_at = now()
  WHERE id = p_telegram_user_id;
  
  RETURN json_build_object(
    'success', true,
    'new_balance', COALESCE(user_record.gcoin_v4_balance, 0) + p_amount,
    'amount_added', p_amount
  );
END;
$$;