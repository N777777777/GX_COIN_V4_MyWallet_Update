-- دالة لإنشاء عرض بيع
CREATE OR REPLACE FUNCTION public.create_sell_order(
  seller_telegram_id BIGINT,
  coin_amount_param NUMERIC,
  ton_amount_param NUMERIC
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  seller_record RECORD;
  new_order_id UUID;
  price_per_coin NUMERIC;
  result JSON;
BEGIN
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
  
  -- حساب السعر لكل عملة
  price_per_coin := ton_amount_param / coin_amount_param;
  
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
$$;

-- دالة لإنشاء عرض شراء
CREATE OR REPLACE FUNCTION public.create_buy_order(
  buyer_telegram_id BIGINT,
  coin_amount_param NUMERIC,
  ton_amount_param NUMERIC
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  buyer_record RECORD;
  new_order_id UUID;
  price_per_coin NUMERIC;
  result JSON;
BEGIN
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
  
  -- حساب السعر لكل عملة
  price_per_coin := ton_amount_param / coin_amount_param;
  
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
$$;