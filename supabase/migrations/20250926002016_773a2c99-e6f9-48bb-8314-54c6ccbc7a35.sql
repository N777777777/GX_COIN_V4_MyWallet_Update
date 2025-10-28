-- إضافة عمود alpha_coins إلى جدول telegram_users
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS alpha_coins NUMERIC DEFAULT 0;

-- تحديث القيم الموجودة للتأكد من عدم وجود قيم NULL
UPDATE public.telegram_users 
SET alpha_coins = 0 
WHERE alpha_coins IS NULL;

-- إنشاء دالة لتحديث رصيد الألفا كوين
CREATE OR REPLACE FUNCTION public.update_alpha_coins(
  p_telegram_user_id UUID,
  p_amount NUMERIC
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
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
  
  -- تحديث رصيد الألفا كوين
  UPDATE public.telegram_users 
  SET alpha_coins = COALESCE(alpha_coins, 0) + p_amount,
      updated_at = now()
  WHERE id = p_telegram_user_id;
  
  RETURN json_build_object(
    'success', true,
    'new_balance', COALESCE(user_record.alpha_coins, 0) + p_amount,
    'amount_added', p_amount
  );
END;
$$;

-- إنشاء دالة للتعدين مع التحقق من الألفا كوين
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
  required_alpha_coins NUMERIC := 1;
  gcoin_reward NUMERIC := 0.1;
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
  
  -- التحقق من وجود رصيد ألفا كافي
  IF COALESCE(user_record.alpha_coins, 0) < required_alpha_coins THEN
    RETURN json_build_object(
      'success', false,
      'message', 'تحتاج إلى ' || required_alpha_coins || ' عملة ألفا للتعدين',
      'required_alpha', required_alpha_coins,
      'current_alpha', COALESCE(user_record.alpha_coins, 0)
    );
  END IF;
  
  -- البحث عن سجل التعدين للمستخدم
  SELECT * INTO mining_record
  FROM public.gcoin_mining
  WHERE telegram_user_id = p_telegram_user_id;
  
  -- التحقق من عدم التعدين اليوم
  IF mining_record IS NOT NULL THEN
    IF DATE(mining_record.last_mining_date) = CURRENT_DATE THEN
      RETURN json_build_object(
        'success', false,
        'message', 'لقد قمت بالتعدين اليوم بالفعل! عد غداً',
        'next_mining_time', (CURRENT_DATE + INTERVAL '1 day')::timestamp,
        'can_mine_today', false
      );
    END IF;
  END IF;
  
  -- خصم الألفا كوين
  UPDATE public.telegram_users 
  SET alpha_coins = alpha_coins - required_alpha_coins
  WHERE id = p_telegram_user_id;
  
  -- إضافة G COIN V4
  UPDATE public.telegram_users 
  SET gcoin_v4_balance = COALESCE(gcoin_v4_balance, 0) + gcoin_reward
  WHERE id = p_telegram_user_id;
  
  -- تحديث أو إنشاء سجل التعدين
  INSERT INTO public.gcoin_mining (telegram_user_id, last_mining_date, total_gcoin_mined)
  VALUES (p_telegram_user_id, now(), gcoin_reward)
  ON CONFLICT (telegram_user_id) 
  DO UPDATE SET 
    last_mining_date = now(),
    total_gcoin_mined = gcoin_mining.total_gcoin_mined + gcoin_reward,
    updated_at = now();
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم التعدين بنجاح! حصلت على ' || gcoin_reward || ' G COIN V4',
    'gcoin_mined', gcoin_reward,
    'alpha_coins_spent', required_alpha_coins,
    'can_mine_today', false,
    'next_mining_time', (CURRENT_DATE + INTERVAL '1 day')::timestamp
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء التعدين: ' || SQLERRM
    );
END;
$$;