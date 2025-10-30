-- إنشاء دالة التعدين G COIN V4
CREATE OR REPLACE FUNCTION public.mine_gcoin(p_telegram_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  alpha_cost NUMERIC := 10;
  gcoin_reward NUMERIC := 1;
BEGIN
  -- الحصول على بيانات المستخدم
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
  
  -- التحقق من وجود عملات ألفا كافية
  IF COALESCE(user_record.alpha_coins, 0) < alpha_cost THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رصيد عملات الألفا غير كافي. تحتاج إلى ' || alpha_cost || ' عملة ألفا'
    );
  END IF;
  
  -- الحصول على سجل التعدين
  SELECT * INTO mining_record
  FROM public.gcoin_mining
  WHERE telegram_user_id = p_telegram_user_id;
  
  -- التحقق من آخر عملية تعدين (24 ساعة)
  IF mining_record IS NOT NULL THEN
    IF mining_record.last_mining_date + INTERVAL '24 hours' > NOW() THEN
      RETURN json_build_object(
        'success', false,
        'message', 'يجب الانتظار 24 ساعة بين كل عملية تعدين'
      );
    END IF;
  END IF;
  
  -- خصم عملات الألفا
  UPDATE public.telegram_users 
  SET 
    alpha_coins = alpha_coins - alpha_cost,
    gcoin_v4_balance = COALESCE(gcoin_v4_balance, 0) + gcoin_reward,
    updated_at = NOW()
  WHERE id = p_telegram_user_id;
  
  -- تحديث أو إنشاء سجل التعدين
  IF mining_record IS NULL THEN
    INSERT INTO public.gcoin_mining (
      telegram_user_id,
      last_mining_date,
      total_gcoin_mined
    ) VALUES (
      p_telegram_user_id,
      NOW(),
      gcoin_reward
    );
  ELSE
    UPDATE public.gcoin_mining
    SET 
      last_mining_date = NOW(),
      total_gcoin_mined = total_gcoin_mined + gcoin_reward,
      updated_at = NOW()
    WHERE telegram_user_id = p_telegram_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم التعدين بنجاح',
    'gcoin_earned', gcoin_reward,
    'alpha_spent', alpha_cost,
    'new_gcoin_balance', COALESCE(user_record.gcoin_v4_balance, 0) + gcoin_reward,
    'new_alpha_balance', user_record.alpha_coins - alpha_cost
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء التعدين: ' || SQLERRM
    );
END;
$function$;

-- إنشاء دالة للحصول على سجل التعدين
CREATE OR REPLACE FUNCTION public.get_user_mining_record(p_telegram_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  can_mine BOOLEAN := false;
  hours_until_next NUMERIC := 0;
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
  
  -- حساب إمكانية التعدين والوقت المتبقي
  IF mining_record IS NULL OR mining_record.last_mining_date + INTERVAL '24 hours' <= NOW() THEN
    can_mine := true;
    hours_until_next := 0;
  ELSE
    can_mine := false;
    hours_until_next := EXTRACT(EPOCH FROM (mining_record.last_mining_date + INTERVAL '24 hours' - NOW())) / 3600;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'can_mine', can_mine,
    'total_gcoin_mined', COALESCE(mining_record.total_gcoin_mined, 0),
    'gcoin_v4_balance', COALESCE(user_record.gcoin_v4_balance, 0),
    'last_mining_date', COALESCE(mining_record.last_mining_date, '1970-01-01'::timestamp),
    'hours_until_next_mining', hours_until_next,
    'user_coins', COALESCE(user_record.coins, 0),
    'user_alpha_coins', COALESCE(user_record.alpha_coins, 0),
    'user_ton_balance', COALESCE(user_record.ton_balance, 0)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ: ' || SQLERRM
    );
END;
$function$;