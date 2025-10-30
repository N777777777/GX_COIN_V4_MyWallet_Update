-- إضافة رسوم 30% للـ P2P

-- تحديث دالة إنشاء عرض الشراء مع رسوم 30%
CREATE OR REPLACE FUNCTION public.create_buy_order(buyer_telegram_id bigint, coin_amount_param numeric, ton_amount_param numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  buyer_record RECORD;
  new_order_id UUID;
  price_per_coin NUMERIC;
  total_with_fees NUMERIC;
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
  
  -- حساب المبلغ الإجمالي مع رسوم 30%
  total_with_fees := ton_amount_param * 1.3;
  
  -- الحصول على بيانات المشتري
  SELECT * INTO buyer_record 
  FROM public.telegram_users 
  WHERE telegram_id = buyer_telegram_id;
  
  IF buyer_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  -- التحقق من وجود رصيد TON كافٍ مع الرسوم
  IF buyer_record.ton_balance < total_with_fees THEN
    RETURN json_build_object('success', false, 'message', 'رصيد TON غير كافي (مطلوب ' || total_with_fees || ' TON مع الرسوم 30%)');
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
  
  -- تجميد TON مع الرسوم
  INSERT INTO public.frozen_balances (user_id, order_id, balance_type, amount)
  VALUES (buyer_record.id, new_order_id, 'ton', total_with_fees);
  
  -- خصم TON مع الرسوم من الرصيد
  UPDATE public.telegram_users 
  SET ton_balance = ton_balance - total_with_fees
  WHERE id = buyer_record.id;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم إنشاء عرض الشراء بنجاح (رسوم 30% مطبقة)',
    'order_id', new_order_id
  );
END;
$$;

-- تحديث دالة تنفيذ التداول مع رسوم 30% للبائع
CREATE OR REPLACE FUNCTION public.execute_trade(order_id_param UUID, buyer_telegram_id BIGINT, trade_amount NUMERIC)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  buyer_record RECORD;
  order_record RECORD;
  seller_record RECORD;
  trade_ton_amount NUMERIC;
  seller_receives NUMERIC;
  new_trade_id UUID;
  frozen_balance_record RECORD;
BEGIN
  -- الحصول على بيانات المشتري
  SELECT * INTO buyer_record 
  FROM public.telegram_users 
  WHERE telegram_id = buyer_telegram_id;
  
  IF buyer_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المشتري غير موجود');
  END IF;
  
  -- الحصول على بيانات العرض
  SELECT * INTO order_record 
  FROM public.p2p_orders 
  WHERE id = order_id_param;
  
  IF order_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'العرض غير موجود');
  END IF;
  
  IF order_record.status NOT IN ('active', 'partially_filled') THEN
    RETURN json_build_object('success', false, 'message', 'العرض غير متاح للتداول');
  END IF;
  
  -- التحقق من كمية التداول
  IF trade_amount > order_record.remaining_amount THEN
    RETURN json_build_object('success', false, 'message', 'الكمية المطلوبة أكبر من المتاح');
  END IF;
  
  -- الحصول على بيانات البائع
  SELECT * INTO seller_record 
  FROM public.telegram_users 
  WHERE id = order_record.seller_id;
  
  IF seller_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'البائع غير موجود');
  END IF;
  
  -- حساب مبلغ TON للتداول
  trade_ton_amount := trade_amount * order_record.price_per_coin;
  
  -- تنفيذ التداول حسب نوع العرض
  IF order_record.order_type = 'sell' THEN
    -- عرض بيع: المشتري يدفع TON ويحصل على العملات
    IF buyer_record.ton_balance < trade_ton_amount THEN
      RETURN json_build_object('success', false, 'message', 'رصيد TON غير كافي للمشتري');
    END IF;
    
    -- خصم TON من المشتري
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance - trade_ton_amount
    WHERE id = buyer_record.id;
    
    -- حساب ما يستلمه البائع (مع خصم رسوم 30%)
    seller_receives := trade_ton_amount * 0.7;
    
    -- إضافة TON للبائع (مع خصم الرسوم)
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance + seller_receives
    WHERE id = seller_record.id;
    
    -- إضافة العملات للمشتري
    UPDATE public.telegram_users 
    SET coins = coins + trade_amount
    WHERE id = buyer_record.id;
    
  ELSE
    -- عرض شراء: البائع يعطي العملات ويحصل على TON
    IF buyer_record.coins < trade_amount THEN
      RETURN json_build_object('success', false, 'message', 'رصيد العملات غير كافي للبائع');
    END IF;
    
    -- خصم العملات من البائع
    UPDATE public.telegram_users 
    SET coins = coins - trade_amount
    WHERE id = buyer_record.id;
    
    -- حساب ما يستلمه البائع (مع خصم رسوم 30%)
    seller_receives := trade_ton_amount * 0.7;
    
    -- إضافة TON للبائع (مع خصم الرسوم)
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance + seller_receives
    WHERE id = buyer_record.id;
    
    -- إضافة العملات لصاحب العرض
    UPDATE public.telegram_users 
    SET coins = coins + trade_amount
    WHERE id = seller_record.id;
  END IF;
  
  -- إنشاء سجل التداول
  INSERT INTO public.p2p_trades (
    order_id,
    seller_id,
    buyer_id,
    coin_amount,
    ton_amount,
    price_per_coin,
    status
  ) VALUES (
    order_id_param,
    CASE WHEN order_record.order_type = 'sell' THEN seller_record.id ELSE buyer_record.id END,
    CASE WHEN order_record.order_type = 'sell' THEN buyer_record.id ELSE seller_record.id END,
    trade_amount,
    trade_ton_amount,
    order_record.price_per_coin,
    'completed'
  ) RETURNING id INTO new_trade_id;
  
  -- تحديث العرض
  UPDATE public.p2p_orders 
  SET 
    filled_amount = filled_amount + trade_amount,
    remaining_amount = remaining_amount - trade_amount,
    status = CASE 
      WHEN remaining_amount - trade_amount <= 0 THEN 'completed'
      ELSE 'partially_filled'
    END,
    updated_at = now()
  WHERE id = order_id_param;
  
  -- تحديث الرصيد المجمد
  SELECT * INTO frozen_balance_record
  FROM public.frozen_balances
  WHERE order_id = order_id_param;
  
  IF frozen_balance_record IS NOT NULL THEN
    IF order_record.remaining_amount - trade_amount <= 0 THEN
      -- حذف الرصيد المجمد إذا تم إكمال العرض
      DELETE FROM public.frozen_balances WHERE order_id = order_id_param;
    ELSE
      -- تحديث الرصيد المجمد
      IF frozen_balance_record.balance_type = 'ton' THEN
        UPDATE public.frozen_balances 
        SET amount = amount - (trade_ton_amount * 1.3)  -- مع حساب الرسوم المدفوعة
        WHERE order_id = order_id_param;
      ELSE
        UPDATE public.frozen_balances 
        SET amount = amount - trade_amount
        WHERE order_id = order_id_param;
      END IF;
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم تنفيذ التداول بنجاح! (رسوم 30% مطبقة على البائع)',
    'trade_id', new_trade_id,
    'seller_received', seller_receives
  );
END;
$$;