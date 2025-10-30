-- حذف السياسات الحالية وإعادة إنشائها
DROP POLICY IF EXISTS "Anyone can view active orders" ON public.p2p_orders;
DROP POLICY IF EXISTS "Users can view all active orders" ON public.p2p_orders;

-- إنشاء سياسة جديدة للسماح للجميع بمشاهدة العروض النشطة
CREATE POLICY "Public can view active orders" 
ON public.p2p_orders 
FOR SELECT 
USING (status IN ('active', 'partially_filled'));

-- تحديث سياسة التداولات
DROP POLICY IF EXISTS "Anyone can view trades" ON public.p2p_trades;
DROP POLICY IF EXISTS "Users can view their trades" ON public.p2p_trades;

CREATE POLICY "Public can view trades" 
ON public.p2p_trades 
FOR SELECT 
USING (true);

-- تحديث سياسة الأرصدة المجمدة
DROP POLICY IF EXISTS "Anyone can view frozen balances" ON public.frozen_balances;
DROP POLICY IF EXISTS "Users can view frozen balances" ON public.frozen_balances;

CREATE POLICY "Public can view frozen balances" 
ON public.frozen_balances 
FOR SELECT 
USING (true);