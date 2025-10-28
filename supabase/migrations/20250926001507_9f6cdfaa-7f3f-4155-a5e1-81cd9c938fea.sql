-- إنشاء دالة محسنة للتعدين مع التحقق المباشر من الرصيد
CREATE OR REPLACE FUNCTION public.mine_gcoin(p_telegram_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  current_coins NUMERIC;
BEGIN
  -- قفل صف المستخدم لضمان التحديث الآمن
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE id = p_telegram_user_id
  FOR UPDATE;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- التحقق من رصيد عملة الألفا الحالي
  current_coins := COALESCE(user_record.coins, 0);
  
  IF current_coins < 10 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رصيد عملة الألفا غير كافي. تحتاج إلى 10 عملات، رصيدك الحالي: ' || current_coins
    );
  END IF;
  
  -- البحث عن سجل التعدين
  SELECT * INTO mining_record
  FROM public.gcoin_mining
  WHERE telegram_user_id = p_telegram_user_id;
  
  -- التحقق من إمكانية التعدين اليوم
  IF mining_record IS NOT NULL AND DATE(mining_record.last_mining_date) >= CURRENT_DATE THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لقد قمت بالتعدين اليوم بالفعل. عد غداً!'
    );
  END IF;
  
  -- خصم 10 عملات ألفا وإضافة 1 G COIN V4
  UPDATE public.telegram_users 
  SET 
    coins = coins - 10,
    gcoin_v4_balance = COALESCE(gcoin_v4_balance, 0) + 1,
    updated_at = now()
  WHERE id = p_telegram_user_id;
  
  -- تحديث أو إنشاء سجل التعدين
  IF mining_record IS NULL THEN
    INSERT INTO public.gcoin_mining (telegram_user_id, total_gcoin_mined, last_mining_date)
    VALUES (p_telegram_user_id, 1, now());
  ELSE
    UPDATE public.gcoin_mining 
    SET 
      total_gcoin_mined = total_gcoin_mined + 1,
      last_mining_date = now(),
      updated_at = now()
    WHERE telegram_user_id = p_telegram_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم التعدين بنجاح! حصلت على 1 G COIN V4',
    'coins_spent', 10,
    'gcoin_earned', 1,
    'remaining_coins', current_coins - 10,
    'new_gcoin_balance', COALESCE(user_record.gcoin_v4_balance, 0) + 1
  );
END;
$function$;