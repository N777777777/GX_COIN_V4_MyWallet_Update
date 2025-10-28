-- دالة لإلغاء عرض
CREATE OR REPLACE FUNCTION public.cancel_order(
  order_id_param UUID,
  user_telegram_id BIGINT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record RECORD;
  user_record RECORD;
  frozen_record RECORD;
BEGIN
  -- الحصول على بيانات المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = user_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  -- الحصول على بيانات العرض
  SELECT * INTO order_record 
  FROM public.p2p_orders 
  WHERE id = order_id_param AND seller_id = user_record.id;
  
  IF order_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'العرض غير موجود أو غير مملوك لك');
  END IF;
  
  IF order_record.status != 'active' THEN
    RETURN json_build_object('success', false, 'message', 'لا يمكن إلغاء العرض في هذه الحالة');
  END IF;
  
  -- الحصول على الرصيد المجمد
  SELECT * INTO frozen_record 
  FROM public.frozen_balances 
  WHERE order_id = order_id_param;
  
  -- إرجاع الرصيد المجمد
  IF frozen_record.balance_type = 'coins' THEN
    UPDATE public.telegram_users 
    SET coins = coins + frozen_record.amount
    WHERE id = user_record.id;
  ELSE
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance + frozen_record.amount
    WHERE id = user_record.id;
  END IF;
  
  -- حذف الرصيد المجمد
  DELETE FROM public.frozen_balances WHERE order_id = order_id_param;
  
  -- تحديث حالة العرض إلى ملغى
  UPDATE public.p2p_orders 
  SET status = 'cancelled'
  WHERE id = order_id_param;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم إلغاء العرض وإرجاع الرصيد بنجاح'
  );
END;
$$;

-- دالة لتنفيذ صفقة
CREATE OR REPLACE FUNCTION public.execute_trade(
  order_id_param UUID,
  buyer_telegram_id BIGINT,
  trade_amount NUMERIC
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_record RECORD;
  buyer_record RECORD;
  seller_record RECORD;
  trade_id UUID;
  ton_amount NUMERIC;
BEGIN
  -- الحصول على بيانات المشتري
  SELECT * INTO buyer_record 
  FROM public.telegram_users 
  WHERE telegram_id = buyer_telegram_id;
  
  IF buyer_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  -- الحصول على بيانات العرض
  SELECT * INTO order_record 
  FROM public.p2p_orders 
  WHERE id = order_id_param AND status = 'active';
  
  IF order_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'العرض غير متاح');
  END IF;
  
  -- التحقق من الكمية المطلوبة
  IF trade_amount > order_record.remaining_amount THEN
    RETURN json_build_object('success', false, 'message', 'الكمية المطلوبة غير متاحة');
  END IF;
  
  -- حساب مبلغ TON المطلوب
  ton_amount := trade_amount * order_record.price_per_coin;
  
  -- الحصول على بيانات البائع
  SELECT * INTO seller_record 
  FROM public.telegram_users 
  WHERE id = order_record.seller_id;
  
  -- التحقق من نوع العرض والأرصدة
  IF order_record.order_type = 'sell' THEN
    -- عرض بيع: المشتري يحتاج TON
    IF buyer_record.ton_balance < ton_amount THEN
      RETURN json_build_object('success', false, 'message', 'رصيد TON غير كافي');
    END IF;
    
    -- تنفيذ الصفقة
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance - ton_amount,
        coins = coins + trade_amount
    WHERE id = buyer_record.id;
    
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance + ton_amount
    WHERE id = seller_record.id;
    
  ELSE
    -- عرض شراء: المشتري يحتاج عملات
    IF buyer_record.coins < trade_amount THEN
      RETURN json_build_object('success', false, 'message', 'رصيد العملات غير كافي');
    END IF;
    
    -- تنفيذ الصفقة
    UPDATE public.telegram_users 
    SET coins = coins - trade_amount,
        ton_balance = ton_balance + ton_amount
    WHERE id = buyer_record.id;
    
    UPDATE public.telegram_users 
    SET coins = coins + trade_amount
    WHERE id = seller_record.id;
  END IF;
  
  -- إنشاء سجل المعاملة
  INSERT INTO public.p2p_trades (
    order_id, seller_id, buyer_id, coin_amount, ton_amount, price_per_coin, status
  ) VALUES (
    order_id_param, order_record.seller_id, buyer_record.id, 
    trade_amount, ton_amount, order_record.price_per_coin, 'completed'
  ) RETURNING id INTO trade_id;
  
  -- تحديث العرض
  UPDATE public.p2p_orders 
  SET remaining_amount = remaining_amount - trade_amount,
      filled_amount = filled_amount + trade_amount,
      status = CASE 
        WHEN remaining_amount - trade_amount <= 0 THEN 'completed'
        ELSE 'partially_filled'
      END
  WHERE id = order_id_param;
  
  -- تحديث الرصيد المجمد
  UPDATE public.frozen_balances 
  SET amount = amount - (CASE 
    WHEN order_record.order_type = 'sell' THEN trade_amount
    ELSE ton_amount
  END)
  WHERE order_id = order_id_param;
  
  -- حذف الرصيد المجمد إذا تم استنفاذه
  DELETE FROM public.frozen_balances 
  WHERE order_id = order_id_param AND amount <= 0;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم تنفيذ الصفقة بنجاح',
    'trade_id', trade_id
  );
END;
$$;