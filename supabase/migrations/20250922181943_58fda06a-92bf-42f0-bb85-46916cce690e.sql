-- تحديث دالة get_user_mining_record لإرجاع بيانات المستخدم الصحيحة
CREATE OR REPLACE FUNCTION public.get_user_mining_record(p_telegram_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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
    'last_mining_date', mining_record.last_mining_date,
    'hours_until_next_mining', hours_until_next,
    'user_coins', user_record.coins,
    'user_ton_balance', user_record.ton_balance
  );
END;
$function$;