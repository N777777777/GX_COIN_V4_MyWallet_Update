-- Update mining function to cost 10 alpha coins and give 1 G COIN V4
CREATE OR REPLACE FUNCTION public.mine_gcoin(p_telegram_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  hours_since_last_mining NUMERIC;
  gcoin_reward NUMERIC := 1; -- 1 G COIN V4 reward
  alpha_cost NUMERIC := 10; -- 10 Alpha coins cost
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
  
  -- التحقق من وجود رصيد كافٍ من عملات ألفا
  IF COALESCE(user_record.alpha_coins, 0) < alpha_cost THEN
    RETURN json_build_object(
      'success', false,
      'message', 'تحتاج إلى 10 عملات ألفا للتعدين',
      'required_alpha_coins', alpha_cost,
      'current_alpha_coins', COALESCE(user_record.alpha_coins, 0)
    );
  END IF;
  
  -- البحث عن سجل التعدين
  SELECT * INTO mining_record
  FROM public.gcoin_mining
  WHERE telegram_user_id = p_telegram_user_id;
  
  IF mining_record IS NOT NULL THEN
    -- حساب الساعات منذ آخر تعدين
    hours_since_last_mining := EXTRACT(EPOCH FROM (now() - mining_record.last_mining_date)) / 3600;
    
    -- التحقق من إمكانية التعدين (كل 24 ساعة)
    IF hours_since_last_mining < 24 THEN
      RETURN json_build_object(
        'success', false,
        'message', 'يمكنك التعدين مرة واحدة كل 24 ساعة',
        'hours_until_next_mining', 24 - hours_since_last_mining
      );
    END IF;
  END IF;
  
  -- خصم عملات ألفا
  UPDATE public.telegram_users 
  SET alpha_coins = alpha_coins - alpha_cost,
      updated_at = now()
  WHERE id = p_telegram_user_id;
  
  -- إضافة G COIN V4
  UPDATE public.telegram_users 
  SET gcoin_v4_balance = COALESCE(gcoin_v4_balance, 0) + gcoin_reward,
      updated_at = now()
  WHERE id = p_telegram_user_id;
  
  -- تحديث أو إنشاء سجل التعدين
  INSERT INTO public.gcoin_mining (
    telegram_user_id,
    total_gcoin_mined,
    last_mining_date
  ) VALUES (
    p_telegram_user_id,
    gcoin_reward,
    now()
  )
  ON CONFLICT (telegram_user_id) 
  DO UPDATE SET 
    total_gcoin_mined = gcoin_mining.total_gcoin_mined + gcoin_reward,
    last_mining_date = now(),
    updated_at = now();
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم التعدين بنجاح! حصلت على 1 G COIN V4',
    'gcoin_earned', gcoin_reward,
    'alpha_coins_spent', alpha_cost,
    'total_gcoin_mined', COALESCE(mining_record.total_gcoin_mined, 0) + gcoin_reward
  );
END;
$function$;