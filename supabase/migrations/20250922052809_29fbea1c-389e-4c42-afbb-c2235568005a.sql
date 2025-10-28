-- Create function to swap PEPE to TON
CREATE OR REPLACE FUNCTION swap_pepe_to_ton(
  user_telegram_id BIGINT,
  pepe_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_pepe NUMERIC;
  ton_amount NUMERIC;
  exchange_rate NUMERIC := 300000; -- 1 TON = 300,000 PEPE
BEGIN
  -- التحقق من صحة المعاملات
  IF user_telegram_id IS NULL OR pepe_amount IS NULL OR pepe_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'معاملات غير صحيحة');
  END IF;

  -- حساب كمية TON
  ton_amount := pepe_amount / exchange_rate;
  
  -- التحقق من الرصيد الحالي من PEPE الإعلاني
  SELECT COALESCE(pepe_advertising_balance, 0) 
  INTO current_pepe 
  FROM telegram_users 
  WHERE telegram_id = user_telegram_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  IF current_pepe < pepe_amount THEN
    RETURN json_build_object('success', false, 'message', 'رصيد PEPE الإعلاني غير كافي');
  END IF;
  
  -- تحديث الأرصدة
  UPDATE telegram_users 
  SET 
    pepe_advertising_balance = COALESCE(pepe_advertising_balance, 0) - pepe_amount,
    ton_balance = COALESCE(ton_balance, 0) + ton_amount,
    updated_at = CURRENT_TIMESTAMP
  WHERE telegram_id = user_telegram_id;
  
  -- تسجيل العملية في جدول المعاملات
  INSERT INTO transactions (
    user_id, 
    type, 
    amount, 
    description, 
    created_at
  ) VALUES (
    user_telegram_id,
    'pepe_to_ton_swap',
    ton_amount,
    'تبديل ' || pepe_amount::text || ' PEPE إلى ' || ton_amount::text || ' TON',
    CURRENT_TIMESTAMP
  );
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم التبديل بنجاح',
    'pepe_amount', pepe_amount,
    'ton_amount', ton_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'حدث خطأ أثناء التبديل: ' || SQLERRM);
END;
$$;