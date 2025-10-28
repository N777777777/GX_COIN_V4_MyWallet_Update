-- Continue fixing remaining database functions with secure search paths
-- This will fix the remaining security warnings

-- 4. handle_ad_view_and_check_qualification
CREATE OR REPLACE FUNCTION public.handle_ad_view_and_check_qualification(user_telegram_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  user_record RECORD;
  ad_views_today INTEGER := 0;
  qualification_won BOOLEAN := FALSE;
  random_value NUMERIC;
  new_market_value NUMERIC;
  result JSON;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = user_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- التحقق من عدد الإعلانات اليوم
  SELECT COALESCE(views_count, 0) INTO ad_views_today
  FROM public.daily_ad_views 
  WHERE telegram_user_id = user_record.id 
  AND view_date = CURRENT_DATE;
  
  -- إذا وصل للحد الأقصى (20 إعلان)
  IF ad_views_today >= 20 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لقد وصلت للحد الأقصى من الإعلانات اليوم (20 إعلان)',
      'max_reached', true,
      'views_today', ad_views_today
    );
  END IF;
  
  -- تحديث عدد الإعلانات
  INSERT INTO public.daily_ad_views (telegram_user_id, telegram_id, views_count)
  VALUES (user_record.id, user_telegram_id, 1)
  ON CONFLICT (telegram_user_id, view_date) 
  DO UPDATE SET 
    views_count = daily_ad_views.views_count + 1,
    updated_at = now();
  
  -- زيادة القيمة السوقية العالمية
  SELECT public.increment_market_value(0.0025) INTO new_market_value;
  
  -- التحقق من الربح بالتأهيل (نسبة 0.0000001%)
  random_value := random();
  IF random_value <= 0.000000001 THEN  -- 0.0000001% = 0.000000001
    qualification_won := TRUE;
    
    -- إضافة المستخدم للمؤهلين يدوياً
    INSERT INTO public.manual_qualified_users (
      telegram_user_id,
      telegram_id,
      first_name,
      username,
      qualification_reason
    ) VALUES (
      user_record.id,
      user_record.telegram_id,
      user_record.first_name,
      user_record.username,
      'ربح التأهيل من صندوق الهدايا'
    )
    ON CONFLICT (telegram_id) DO NOTHING;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'qualification_won', qualification_won,
    'views_today', ad_views_today + 1,
    'remaining_views', 20 - (ad_views_today + 1),
    'new_market_value', new_market_value
  );
END;
$function$;

-- 5. update_airdrop_updated_at
CREATE OR REPLACE FUNCTION public.update_airdrop_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 6. create_sell_order
CREATE OR REPLACE FUNCTION public.create_sell_order(seller_telegram_id bigint, coin_amount_param numeric, ton_amount_param numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE
  seller_record RECORD;
  new_order_id UUID;
  price_per_coin NUMERIC;
  result JSON;
BEGIN
  -- التحقق من الحد الأدنى للكمية
  IF coin_amount_param < 5 THEN
    RETURN json_build_object('success', false, 'message', 'الحد الأدنى لبيع العملات هو 5 عملات');
  END IF;
  
  -- حساب السعر لكل عملة للتحقق من الحد الأدنى
  price_per_coin := ton_amount_param / coin_amount_param;
  IF price_per_coin < 0.0001 THEN
    RETURN json_build_object('success', false, 'message', 'الحد الأدنى للسعر هو 0.0001 TON لكل عملة');
  END IF;
  
  -- الحصول على بيانات البائع
  SELECT * INTO seller_record 
  FROM public.telegram_users 
  WHERE telegram_id = seller_telegram_id;
  
  IF seller_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  -- التحقق من وجود رصيد كافٍ
  IF seller_record.coins < coin_amount_param THEN
    RETURN json_build_object('success', false, 'message', 'رصيد العملات غير كافي');
  END IF;
  
  -- إنشاء العرض
  INSERT INTO public.p2p_orders (
    seller_id, 
    order_type, 
    coin_amount, 
    ton_amount, 
    price_per_coin,
    remaining_amount
  ) VALUES (
    seller_record.id,
    'sell',
    coin_amount_param,
    ton_amount_param,
    price_per_coin,
    coin_amount_param
  ) RETURNING id INTO new_order_id;
  
  -- تجميد العملات
  INSERT INTO public.frozen_balances (user_id, order_id, balance_type, amount)
  VALUES (seller_record.id, new_order_id, 'coins', coin_amount_param);
  
  -- خصم العملات من الرصيد
  UPDATE public.telegram_users 
  SET coins = coins - coin_amount_param
  WHERE id = seller_record.id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم إنشاء عرض البيع بنجاح',
    'order_id', new_order_id
  );
END;
$function$;