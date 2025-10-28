-- تحديث دالة إنشاء عرض البيع لتطبيق الحدود الدنيا الجديدة
CREATE OR REPLACE FUNCTION public.create_sell_order(seller_telegram_id bigint, coin_amount_param numeric, ton_amount_param numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
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

-- تحديث دالة إنشاء عرض الشراء لتطبيق الحدود الدنيا الجديدة
CREATE OR REPLACE FUNCTION public.create_buy_order(buyer_telegram_id bigint, coin_amount_param numeric, ton_amount_param numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  buyer_record RECORD;
  new_order_id UUID;
  price_per_coin NUMERIC;
  result JSON;
BEGIN
  -- التحقق من الحد الأدنى للكمية
  IF coin_amount_param < 5 THEN
    RETURN json_build_object('success', false, 'message', 'الحد الأدنى لشراء العملات هو 5 عملات');
  END IF;
  
  -- حساب السعر لكل عملة للتحقق من الحد الأدنى
  price_per_coin := ton_amount_param / coin_amount_param;
  IF price_per_coin < 0.0001 THEN
    RETURN json_build_object('success', false, 'message', 'الحد الأدنى للسعر هو 0.0001 TON لكل عملة');
  END IF;
  
  -- الحصول على بيانات المشتري
  SELECT * INTO buyer_record 
  FROM public.telegram_users 
  WHERE telegram_id = buyer_telegram_id;
  
  IF buyer_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  -- التحقق من وجود رصيد TON كافٍ
  IF buyer_record.ton_balance < ton_amount_param THEN
    RETURN json_build_object('success', false, 'message', 'رصيد TON غير كافي');
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
    buyer_record.id,
    'buy',
    coin_amount_param,
    ton_amount_param,
    price_per_coin,
    coin_amount_param
  ) RETURNING id INTO new_order_id;
  
  -- تجميد TON
  INSERT INTO public.frozen_balances (user_id, order_id, balance_type, amount)
  VALUES (buyer_record.id, new_order_id, 'ton', ton_amount_param);
  
  -- خصم TON من الرصيد
  UPDATE public.telegram_users 
  SET ton_balance = ton_balance - ton_amount_param
  WHERE id = buyer_record.id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم إنشاء عرض الشراء بنجاح',
    'order_id', new_order_id
  );
END;
$function$;