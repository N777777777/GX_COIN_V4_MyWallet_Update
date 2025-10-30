-- تحديث سياسات RLS للسماح للجميع بمشاهدة العروض النشطة
DROP POLICY IF EXISTS "Users can view all active orders" ON public.p2p_orders;

-- إنشاء سياسة محدثة للسماح للجميع بمشاهدة العروض النشطة
CREATE POLICY "Anyone can view active orders" 
ON public.p2p_orders 
FOR SELECT 
USING (status IN ('active', 'partially_filled'));

-- تحديث سياسة المشاهدة للتداولات للسماح للجميع بالمشاهدة
DROP POLICY IF EXISTS "Users can view their trades" ON public.p2p_trades;

CREATE POLICY "Anyone can view trades" 
ON public.p2p_trades 
FOR SELECT 
USING (true);

-- تحديث سياسة المشاهدة للأرصدة المجمدة للسماح للجميع بالمشاهدة  
DROP POLICY IF EXISTS "Users can view frozen balances" ON public.frozen_balances;

CREATE POLICY "Anyone can view frozen balances" 
ON public.frozen_balances 
FOR SELECT 
USING (true);