-- إنشاء دالة معالجة عمولات الإحالات
CREATE OR REPLACE FUNCTION public.process_referral_commission(
  p_referred_telegram_id bigint,
  p_commission_type text,
  p_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referred_user RECORD;
  referrer_user RECORD;
  commission_rate NUMERIC;
  commission_amount NUMERIC;
BEGIN
  -- الحصول على بيانات المستخدم المُحال
  SELECT * INTO referred_user 
  FROM public.telegram_users 
  WHERE telegram_id = p_referred_telegram_id;
  
  IF referred_user IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم المُحال غير موجود'
    );
  END IF;
  
  -- التحقق من وجود مُحيل
  IF referred_user.referrer_telegram_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم ليس لديه مُحيل'
    );
  END IF;
  
  -- الحصول على بيانات المُحيل
  SELECT * INTO referrer_user 
  FROM public.telegram_users 
  WHERE telegram_id = referred_user.referrer_telegram_id;
  
  IF referrer_user IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المُحيل غير موجود'
    );
  END IF;
  
  -- الحصول على معدل العمولة
  SELECT COALESCE(cs.commission_rate, 0.35) INTO commission_rate
  FROM public.commission_settings cs
  WHERE cs.commission_type = 'referral' 
  AND cs.is_active = true
  LIMIT 1;
  
  -- حساب العمولة
  commission_amount := FLOOR(p_amount * commission_rate);
  
  IF commission_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'مبلغ العمولة صفر'
    );
  END IF;
  
  -- إضافة العمولة إلى رصيد المُحيل
  UPDATE public.telegram_users 
  SET bal_a6c3z = COALESCE(bal_a6c3z, 0) + commission_amount,
      updated_at = NOW()
  WHERE telegram_id = referrer_user.telegram_id;
  
  -- تسجيل العمولة في جدول commission_earnings
  INSERT INTO public.commission_earnings (
    earner_type,
    manager_telegram_id,
    commission_type,
    amount,
    source_user_telegram_id
  ) VALUES (
    'referrer',
    referrer_user.telegram_id,
    p_commission_type,
    commission_amount,
    referred_user.telegram_id
  );
  
  RETURN json_build_object(
    'success', true,
    'referrer_telegram_id', referrer_user.telegram_id,
    'commission_amount', commission_amount,
    'commission_rate', commission_rate,
    'message', 'تم معالجة العمولة بنجاح'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ: ' || SQLERRM
    );
END;
$$;