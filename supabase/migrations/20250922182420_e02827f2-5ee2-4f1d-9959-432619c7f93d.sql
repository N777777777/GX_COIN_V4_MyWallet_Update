-- إضافة عمود رصيد G COIN V4 لجدول المستخدمين
ALTER TABLE public.telegram_users 
ADD COLUMN gcoin_v4_balance NUMERIC DEFAULT 0;

-- تحديث رصيد G COIN V4 للمستخدمين الحاليين بناءً على سجلات التعدين
UPDATE public.telegram_users 
SET gcoin_v4_balance = COALESCE(
  (SELECT total_gcoin_mined FROM public.gcoin_mining WHERE telegram_user_id = telegram_users.id), 
  0
);

-- تحديث دالة التعدين لتحديث رصيد G COIN V4
CREATE OR REPLACE FUNCTION public.mine_gcoin(p_telegram_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  can_mine BOOLEAN := false;
  hours_since_last_mining NUMERIC;
BEGIN
  -- الحصول على بيانات المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE id = p_telegram_user_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- التحقق من وجود 10 عملات ألفا على الأقل
  IF user_record.coins < 10 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'تحتاج إلى 10 عملات ألفا على الأقل للتعدين'
    );
  END IF;
  
  -- الحصول على سجل التعدين
  SELECT * INTO mining_record
  FROM public.gcoin_mining
  WHERE telegram_user_id = p_telegram_user_id;
  
  IF mining_record IS NULL THEN
    -- أول مرة تعدين
    can_mine := true;
  ELSE
    -- التحقق من مرور 24 ساعة
    hours_since_last_mining := EXTRACT(EPOCH FROM (now() - mining_record.last_mining_date)) / 3600;
    can_mine := hours_since_last_mining >= 24;
  END IF;
  
  IF NOT can_mine THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يجب انتظار 24 ساعة بين كل عملية تعدين'
    );
  END IF;
  
  -- خصم 10 عملات ألفا
  UPDATE public.telegram_users 
  SET coins = coins - 10
  WHERE id = p_telegram_user_id;
  
  -- إضافة 1 G COIN V4
  UPDATE public.telegram_users 
  SET gcoin_v4_balance = gcoin_v4_balance + 1
  WHERE id = p_telegram_user_id;
  
  -- تحديث سجل التعدين
  INSERT INTO public.gcoin_mining (telegram_user_id, total_gcoin_mined, last_mining_date)
  VALUES (p_telegram_user_id, 1, now())
  ON CONFLICT (telegram_user_id) 
  DO UPDATE SET 
    total_gcoin_mined = gcoin_mining.total_gcoin_mined + 1,
    last_mining_date = now(),
    updated_at = now();
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم التعدين بنجاح! حصلت على 1 G COIN V4',
    'gcoin_earned', 1
  );
END;
$function$;

-- تحديث دالة جلب سجل التعدين لإرجاع رصيد G COIN V4
CREATE OR REPLACE FUNCTION public.get_user_mining_record(p_telegram_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  hours_until_next NUMERIC;
  can_mine BOOLEAN := false;
BEGIN
  -- الحصول على بيانات المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE id = p_telegram_user_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- الحصول على سجل التعدين
  SELECT * INTO mining_record
  FROM public.gcoin_mining
  WHERE telegram_user_id = p_telegram_user_id;
  
  IF mining_record IS NULL THEN
    -- إذا لم يكن هناك سجل تعدين، المستخدم يمكنه التعدين
    can_mine := true;
    hours_until_next := 0;
  ELSE
    -- التحقق من إمكانية التعدين (24 ساعة من آخر تعدين)
    hours_until_next := EXTRACT(EPOCH FROM (mining_record.last_mining_date + INTERVAL '24 hours' - now())) / 3600;
    can_mine := hours_until_next <= 0;
    
    -- التأكد من أن الرقم موجب
    IF hours_until_next < 0 THEN
      hours_until_next := 0;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'can_mine', can_mine,
    'total_gcoin_mined', COALESCE(mining_record.total_gcoin_mined, 0),
    'gcoin_v4_balance', COALESCE(user_record.gcoin_v4_balance, 0),
    'last_mining_date', mining_record.last_mining_date,
    'hours_until_next_mining', hours_until_next,
    'user_coins', user_record.coins,
    'user_ton_balance', user_record.ton_balance
  );
END;
$function$;