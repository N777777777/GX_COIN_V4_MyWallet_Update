-- دمج رصيد PEPE الإعلاني مع الرصيد العادي
-- نقل جميع الأرصدة الإعلانية إلى الرصيد العادي القابل للسحب
UPDATE public.telegram_users 
SET pepe_withdrawable_balance = COALESCE(pepe_withdrawable_balance, 0) + COALESCE(pepe_advertising_balance, 0),
    pepe_advertising_balance = 0
WHERE pepe_advertising_balance > 0;

-- تحديث دالة swap_ton_to_pepe لإضافة PEPE للرصيد العادي بدلاً من الإعلاني
CREATE OR REPLACE FUNCTION public.swap_ton_to_pepe(user_telegram_id bigint, ton_amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  pepe_amount NUMERIC;
  exchange_rate NUMERIC := 300000; -- 1 TON = 300,000 PEPE
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = user_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- التحقق من وجود رصيد TON كافٍ
  IF user_record.ton_balance < ton_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رصيد TON غير كافي'
    );
  END IF;
  
  -- حساب كمية PEPE
  pepe_amount := ton_amount * exchange_rate;
  
  -- تحديث الأرصدة - إضافة PEPE للرصيد العادي القابل للسحب
  UPDATE public.telegram_users 
  SET 
    ton_balance = ton_balance - ton_amount,
    pepe_withdrawable_balance = pepe_withdrawable_balance + pepe_amount
  WHERE id = user_record.id;
  
  -- تسجيل المعاملة
  INSERT INTO public.swap_transactions (
    user_id,
    user_telegram_id,
    from_currency,
    to_currency,
    from_amount,
    to_amount,
    exchange_rate
  ) VALUES (
    user_record.id,
    user_telegram_id,
    'TON',
    'PEPE',
    ton_amount,
    pepe_amount,
    exchange_rate
  );
  
  RETURN json_build_object(
    'success', true,
    'pepe_received', pepe_amount,
    'exchange_rate', exchange_rate,
    'balance_type', 'withdrawable'
  );
END;
$$;