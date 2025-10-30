-- إصلاح دالة إلغاء العرض
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
  
  IF order_record.status NOT IN ('active', 'partially_filled') THEN
    RETURN json_build_object('success', false, 'message', 'لا يمكن إلغاء العرض في هذه الحالة');
  END IF;
  
  -- الحصول على الرصيد المجمد
  SELECT * INTO frozen_record 
  FROM public.frozen_balances 
  WHERE order_id = order_id_param AND user_id = user_record.id;
  
  IF frozen_record IS NOT NULL THEN
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
  END IF;
  
  -- تحديث حالة العرض إلى ملغى
  UPDATE public.p2p_orders 
  SET status = 'cancelled', updated_at = now()
  WHERE id = order_id_param;
  
  RETURN json_build_object(
    'success', true, 
    'message', 'تم إلغاء العرض وإرجاع الرصيد بنجاح'
  );
END;
$$;

-- إصلاح دالة تنفيذ التداول
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
  -- الحصول على بيانات المشتري (منفذ التداول)
  SELECT * INTO buyer_record 
  FROM public.telegram_users 
  WHERE telegram_id = buyer_telegram_id;
  
  IF buyer_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  -- الحصول على بيانات العرض
  SELECT * INTO order_record 
  FROM public.p2p_orders 
  WHERE id = order_id_param AND status IN ('active', 'partially_filled');
  
  IF order_record IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'العرض غير متاح');
  END IF;
  
  -- التحقق من أن المستخدم لا يتداول مع نفسه
  IF order_record.seller_id = buyer_record.id THEN
    RETURN json_build_object('success', false, 'message', 'لا يمكنك التداول مع عرضك الخاص');
  END IF;
  
  -- التحقق من الكمية المطلوبة
  IF trade_amount <= 0 OR trade_amount > order_record.remaining_amount THEN
    RETURN json_build_object('success', false, 'message', 'الكمية المطلوبة غير صحيحة أو غير متاحة');
  END IF;
  
  -- حساب مبلغ TON المطلوب
  ton_amount := trade_amount * order_record.price_per_coin;
  
  -- الحصول على بيانات مالك العرض
  SELECT * INTO seller_record 
  FROM public.telegram_users 
  WHERE id = order_record.seller_id;
  
  -- التحقق من نوع العرض وتنفيذ التداول
  IF order_record.order_type = 'sell' THEN
    -- عرض بيع: صاحب العرض يبيع عملات مقابل TON
    -- منفذ التداول يحتاج TON ليشتري العملات
    IF buyer_record.ton_balance < ton_amount THEN
      RETURN json_build_object('success', false, 'message', 'رصيد TON غير كافي للشراء');
    END IF;
    
    -- تنفيذ التداول
    -- منفذ التداول: يدفع TON ويحصل على عملات
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance - ton_amount,
        coins = coins + trade_amount
    WHERE id = buyer_record.id;
    
    -- صاحب العرض: يحصل على TON (العملات مجمدة مسبقاً)
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance + ton_amount
    WHERE id = seller_record.id;
    
  ELSE
    -- عرض شراء: صاحب العرض يريد شراء عملات بـ TON (TON مجمد مسبقاً)
    -- منفذ التداول يحتاج عملات ليبيعها مقابل TON
    IF buyer_record.coins < trade_amount THEN
      RETURN json_build_object('success', false, 'message', 'رصيد العملات غير كافي للبيع');
    END IF;
    
    -- تنفيذ التداول
    -- منفذ التداول: يبيع عملات ويحصل على TON
    UPDATE public.telegram_users 
    SET coins = coins - trade_amount,
        ton_balance = ton_balance + ton_amount
    WHERE id = buyer_record.id;
    
    -- صاحب العرض: يحصل على العملات (TON مجمد مسبقاً)
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
      END,
      updated_at = now()
  WHERE id = order_id_param;
  
  -- تحديث الرصيد المجمد
  IF order_record.order_type = 'sell' THEN
    -- تقليل العملات المجمدة
    UPDATE public.frozen_balances 
    SET amount = amount - trade_amount
    WHERE order_id = order_id_param AND balance_type = 'coins';
  ELSE
    -- تقليل TON المجمد
    UPDATE public.frozen_balances 
    SET amount = amount - ton_amount
    WHERE order_id = order_id_param AND balance_type = 'ton';
  END IF;
  
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