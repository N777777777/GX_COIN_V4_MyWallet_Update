-- دالة لحساب وإضافة عمولة G COIN للمُحيل
CREATE OR REPLACE FUNCTION public.add_gcoin_referral_commission(
  referrer_telegram_id BIGINT,
  referred_user_telegram_id BIGINT,
  earned_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_record RECORD;
  commission_rate NUMERIC;
  commission_amount NUMERIC;
BEGIN
  -- البحث عن المُحيل
  SELECT * INTO referrer_record 
  FROM public.telegram_users 
  WHERE telegram_id = referrer_telegram_id;
  
  IF referrer_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المُحيل غير موجود'
    );
  END IF;
  
  -- الحصول على نسبة العمولة (القيمة الافتراضية 0.1)
  commission_rate := COALESCE(referrer_record.gcoin_referral_commission_rate, 0.1);
  
  -- حساب مبلغ العمولة
  commission_amount := earned_amount * commission_rate;
  
  -- إضافة العمولة لرصيد G COIN للمُحيل
  UPDATE public.telegram_users 
  SET bal_g4v7y = COALESCE(bal_g4v7y, 0) + commission_amount,
      updated_at = now()
  WHERE telegram_id = referrer_telegram_id;
  
  -- تسجيل العمولة في جدول commission_earnings
  INSERT INTO public.commission_earnings (
    earner_type,
    commission_type,
    manager_telegram_id,
    source_user_telegram_id,
    amount
  ) VALUES (
    'referrer',
    'gcoin_referral',
    referrer_telegram_id,
    referred_user_telegram_id,
    commission_amount
  );
  
  RETURN json_build_object(
    'success', true,
    'referrer_telegram_id', referrer_telegram_id,
    'commission_rate', commission_rate,
    'commission_amount', commission_amount,
    'new_balance', COALESCE(referrer_record.bal_g4v7y, 0) + commission_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ: ' || SQLERRM
    );
END;
$$;