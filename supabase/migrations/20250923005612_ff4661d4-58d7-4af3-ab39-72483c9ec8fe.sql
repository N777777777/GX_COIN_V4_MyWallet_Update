-- تحديث دالة get_user_mining_record لإصلاح عرض رصيد عملات ألفا
CREATE OR REPLACE FUNCTION public.get_user_mining_record(p_telegram_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  hours_since_last_mining NUMERIC;
  can_mine_now BOOLEAN := false;
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
  
  -- حساب الساعات منذ آخر تعدين
  IF mining_record IS NOT NULL AND mining_record.last_mining_date IS NOT NULL THEN
    hours_since_last_mining := EXTRACT(EPOCH FROM (NOW() - mining_record.last_mining_date)) / 3600;
    can_mine_now := hours_since_last_mining >= 24;
  ELSE
    -- أول مرة تعدين
    can_mine_now := true;
    hours_since_last_mining := 24;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'can_mine', can_mine_now,
    'total_gcoin_mined', COALESCE(mining_record.total_gcoin_mined, 0),
    'gcoin_v4_balance', COALESCE(user_record.gcoin_v4_balance, 0),
    'last_mining_date', mining_record.last_mining_date,
    'hours_until_next_mining', CASE 
      WHEN can_mine_now THEN 0
      ELSE 24 - hours_since_last_mining
    END,
    'user_coins', COALESCE(user_record.coins, 0), -- عملات ألفا الحقيقية
    'user_ton_balance', COALESCE(user_record.ton_balance, 0)
  );
END;
$function$