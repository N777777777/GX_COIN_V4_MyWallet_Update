-- تحديث دالة get_user_mining_record لتتعامل مع alpha_coins
CREATE OR REPLACE FUNCTION public.get_user_mining_record(
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
  hours_until_next NUMERIC := 0;
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
      -- حساب الساعات المتبقية للتعدين التالي
      hours_until_next := EXTRACT(EPOCH FROM (
        (DATE(mining_record.last_mining_date) + INTERVAL '1 day') - NOW()
      )) / 3600;
      
      IF hours_until_next < 0 THEN
        hours_until_next := 0;
        can_mine_today := true;
      END IF;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'can_mine', can_mine_today,
    'total_gcoin_mined', COALESCE(mining_record.total_gcoin_mined, 0),
    'gcoin_v4_balance', COALESCE(user_record.gcoin_v4_balance, 0),
    'last_mining_date', COALESCE(mining_record.last_mining_date, '1970-01-01'::timestamp),
    'hours_until_next_mining', COALESCE(hours_until_next, 0),
    'user_coins', COALESCE(user_record.coins, 0),
    'user_alpha_coins', COALESCE(user_record.alpha_coins, 0),
    'user_ton_balance', COALESCE(user_record.ton_balance, 0)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء جلب سجل التعدين: ' || SQLERRM
    );
END;
$$;