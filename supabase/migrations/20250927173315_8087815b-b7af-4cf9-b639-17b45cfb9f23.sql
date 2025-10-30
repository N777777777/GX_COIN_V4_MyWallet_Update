-- تحديث دالة mine_gcoin لتستخدم alpha_coins بدلاً من coins
CREATE OR REPLACE FUNCTION public.mine_gcoin(
  p_telegram_user_id UUID
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  can_mine_today BOOLEAN := false;
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
  
  -- التحقق من وجود رصيد كافٍ من alpha_coins (1 عملة ألفا على الأقل)
  IF COALESCE(user_record.alpha_coins, 0) < 1 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'تحتاج إلى عملة ألفا واحدة على الأقل للتعدين'
    );
  END IF;
  
  -- البحث عن سجل التعدين
  SELECT * INTO mining_record
  FROM public.gcoin_mining
  WHERE telegram_user_id = p_telegram_user_id;
  
  -- التحقق من إمكانية التعدين اليوم
  IF mining_record IS NULL THEN
    can_mine_today := true;
  ELSE
    IF DATE(mining_record.last_mining_date) < CURRENT_DATE THEN
      can_mine_today := true;
    ELSE
      can_mine_today := false;
    END IF;
  END IF;
  
  IF NOT can_mine_today THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا يمكن التعدين إلا مرة واحدة كل 24 ساعة'
    );
  END IF;
  
  -- خصم 1 عملة ألفا من المستخدم
  UPDATE public.telegram_users 
  SET alpha_coins = alpha_coins - 1
  WHERE id = p_telegram_user_id;
  
  -- إضافة 0.1 G COIN V4 للمستخدم
  UPDATE public.telegram_users 
  SET gcoin_v4_balance = COALESCE(gcoin_v4_balance, 0) + 0.1
  WHERE id = p_telegram_user_id;
  
  -- تحديث أو إنشاء سجل التعدين
  IF mining_record IS NULL THEN
    INSERT INTO public.gcoin_mining (
      telegram_user_id,
      total_gcoin_mined,
      last_mining_date
    ) VALUES (
      p_telegram_user_id,
      0.1,
      NOW()
    );
  ELSE
    UPDATE public.gcoin_mining 
    SET 
      total_gcoin_mined = total_gcoin_mined + 0.1,
      last_mining_date = NOW(),
      updated_at = NOW()
    WHERE telegram_user_id = p_telegram_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم التعدين بنجاح! حصلت على 0.1 G COIN V4 مقابل 1 عملة ألفا',
    'gcoin_earned', 0.1,
    'alpha_coins_spent', 1
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء التعدين: ' || SQLERRM
    );
END;
$$;