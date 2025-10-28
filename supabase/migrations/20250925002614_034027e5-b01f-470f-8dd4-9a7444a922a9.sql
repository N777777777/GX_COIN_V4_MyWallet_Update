-- تحديث دالة الحصول على سجل التعدين لضمان إرجاع الرصيد الصحيح
CREATE OR REPLACE FUNCTION public.get_user_mining_record(p_telegram_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  mining_record RECORD;
  can_mine_today BOOLEAN := FALSE;
  hours_until_next NUMERIC := 0;
BEGIN
  -- البحث عن المستخدم والحصول على الرصيد الحقيقي
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
  
  -- إذا لم يوجد سجل، إنشاؤه
  IF mining_record IS NULL THEN
    INSERT INTO public.gcoin_mining (telegram_user_id, total_gcoin_mined, last_mining_date)
    VALUES (p_telegram_user_id, 0, '1970-01-01'::timestamp)
    RETURNING * INTO mining_record;
  END IF;
  
  -- التحقق من إمكانية التعدين اليوم
  IF DATE(mining_record.last_mining_date) < CURRENT_DATE THEN
    can_mine_today := TRUE;
    hours_until_next := 0;
  ELSE
    can_mine_today := FALSE;
    hours_until_next := EXTRACT(EPOCH FROM (DATE(mining_record.last_mining_date) + INTERVAL '1 day' - NOW())) / 3600;
  END IF;
  
  -- إرجاع البيانات مع التأكد من عرض الرصيد الحقيقي لعملة الألفا
  RETURN json_build_object(
    'success', true,
    'can_mine', can_mine_today,
    'total_gcoin_mined', COALESCE(mining_record.total_gcoin_mined, 0),
    'gcoin_v4_balance', COALESCE(user_record.gcoin_v4_balance, 0),
    'last_mining_date', mining_record.last_mining_date,
    'hours_until_next_mining', GREATEST(hours_until_next, 0),
    'user_coins', COALESCE(user_record.coins, 0), -- الرصيد الحقيقي لعملة الألفا
    'user_ton_balance', COALESCE(user_record.ton_balance, 0)
  );
END;
$function$;