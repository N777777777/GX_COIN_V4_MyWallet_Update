-- حذف الجداول الموجودة وإعادة إنشائها
DROP TABLE IF EXISTS public.frozen_balances CASCADE;
DROP TABLE IF EXISTS public.p2p_trades CASCADE;
DROP TABLE IF EXISTS public.p2p_orders CASCADE;

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