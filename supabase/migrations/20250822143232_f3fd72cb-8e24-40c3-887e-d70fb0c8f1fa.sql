-- إضافة عمودين منفصلين لرصيد PEPE
-- رصيد إعلاني (غير قابل للسحب) ورصيد عادي (قابل للسحب)

-- إضافة عمود الرصيد الإعلاني
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS pepe_advertising_balance numeric DEFAULT 0;

-- إضافة عمود الرصيد العادي القابل للسحب
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS pepe_withdrawable_balance numeric DEFAULT 0;

-- نقل الرصيد الحالي إلى الرصيد الإعلاني (لأن النظام الحالي كان للإعلانات)
UPDATE public.telegram_users 
SET pepe_advertising_balance = COALESCE(pepe_balance, 0)
WHERE pepe_advertising_balance = 0;

-- إضافة تعليق توضيحي للأعمدة
COMMENT ON COLUMN public.telegram_users.pepe_advertising_balance IS 'رصيد PEPE الإعلاني - مخصص للحملات ومهام الشركاء فقط';
COMMENT ON COLUMN public.telegram_users.pepe_withdrawable_balance IS 'رصيد PEPE العادي - قابل للسحب';

-- تحديث فانكشن التبديل ليضع PEPE في الرصيد الإعلاني
CREATE OR REPLACE FUNCTION public.swap_ton_to_pepe(user_telegram_id bigint, ton_amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
  
  -- تحديث الأرصدة - إضافة PEPE للرصيد الإعلاني
  UPDATE public.telegram_users 
  SET 
    ton_balance = ton_balance - ton_amount,
    pepe_advertising_balance = pepe_advertising_balance + pepe_amount
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
    'PEPE_ADVERTISING',
    ton_amount,
    pepe_amount,
    exchange_rate
  );
  
  RETURN json_build_object(
    'success', true,
    'pepe_received', pepe_amount,
    'exchange_rate', exchange_rate,
    'balance_type', 'advertising'
  );
END;
$function$;

-- إنشاء فانكشن جديد لإضافة رصيد PEPE عادي
CREATE OR REPLACE FUNCTION public.add_withdrawable_pepe(user_telegram_id bigint, pepe_amount numeric, source_description text DEFAULT 'مكافأة')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
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
  
  -- إضافة PEPE للرصيد العادي القابل للسحب
  UPDATE public.telegram_users 
  SET pepe_withdrawable_balance = pepe_withdrawable_balance + pepe_amount
  WHERE id = user_record.id;
  
  RETURN json_build_object(
    'success', true,
    'pepe_added', pepe_amount,
    'source', source_description,
    'balance_type', 'withdrawable'
  );
END;
$function$;