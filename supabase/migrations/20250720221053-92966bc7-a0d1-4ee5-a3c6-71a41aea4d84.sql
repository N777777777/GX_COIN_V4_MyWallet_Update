-- إنشاء جدول عروض P2P
CREATE TABLE public.p2p_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  buyer_id UUID,
  order_type TEXT NOT NULL CHECK (order_type IN ('sell', 'buy')),
  coin_amount NUMERIC NOT NULL,
  ton_amount NUMERIC NOT NULL,
  price_per_coin NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_filled', 'completed', 'cancelled')),
  filled_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول تداولات P2P
CREATE TABLE public.p2p_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.p2p_orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  coin_amount NUMERIC NOT NULL,
  ton_amount NUMERIC NOT NULL,
  price_per_coin NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- إنشاء جدول الأرصدة المجمدة
CREATE TABLE public.frozen_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.p2p_orders(id) ON DELETE CASCADE,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('coins', 'ton')),
  amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين RLS
ALTER TABLE public.p2p_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frozen_balances ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للعروض
CREATE POLICY "Users can view all active orders" 
ON public.p2p_orders 
FOR SELECT 
USING (status IN ('active', 'partially_filled'));

CREATE POLICY "Users can create their own orders" 
ON public.p2p_orders 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own orders" 
ON public.p2p_orders 
FOR UPDATE 
USING (true);

-- سياسات RLS للتداولات
CREATE POLICY "Users can view their trades" 
ON public.p2p_trades 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create trades" 
ON public.p2p_trades 
FOR INSERT 
WITH CHECK (true);

-- سياسات RLS للأرصدة المجمدة
CREATE POLICY "Users can view frozen balances" 
ON public.frozen_balances 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage frozen balances" 
ON public.frozen_balances 
FOR ALL 
USING (true);

-- إنشاء trigger لتحديث updated_at
CREATE TRIGGER update_p2p_orders_updated_at
    BEFORE UPDATE ON public.p2p_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

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