-- تحديث نسب عمولة الإحالات للمديرين المحددين
-- هؤلاء المديرين سيحصلون على نسب عمولة مخصصة من إحالاتهم

-- إنشاء جدول لنسب عمولة الإحالات الخاصة بالمديرين
CREATE TABLE IF NOT EXISTS public.manager_referral_commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_telegram_username TEXT NOT NULL UNIQUE,
  pepe_commission_rate NUMERIC NOT NULL DEFAULT 0.60,
  alpha_commission_rate NUMERIC NOT NULL DEFAULT 0.06,
  gcoin_v4_commission_rate NUMERIC NOT NULL DEFAULT 0.10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.manager_referral_commission_rates ENABLE ROW LEVEL SECURITY;

-- سياسة للقراءة - الجميع يمكنهم مشاهدة النسب النشطة
CREATE POLICY "Anyone can view active manager rates"
ON public.manager_referral_commission_rates
FOR SELECT
USING (is_active = true);

-- سياسة للإدارة - Service role فقط
CREATE POLICY "Service role can manage manager rates"
ON public.manager_referral_commission_rates
FOR ALL
USING (auth.role() = 'service_role');

-- إدراج نسب العمولة للمديرين المحددين
INSERT INTO public.manager_referral_commission_rates (
  manager_telegram_username,
  pepe_commission_rate,
  alpha_commission_rate,
  gcoin_v4_commission_rate
) VALUES
  ('Ammar_1011', 0.60, 0.06, 0.10),
  ('G_COIN_help_Support', 0.60, 0.06, 0.10),
  ('S9_P6', 0.60, 0.06, 0.10),
  ('d8ded', 0.60, 0.06, 0.10),
  ('KINGCRYPTO771', 0.60, 0.06, 0.10)
ON CONFLICT (manager_telegram_username) 
DO UPDATE SET
  pepe_commission_rate = EXCLUDED.pepe_commission_rate,
  alpha_commission_rate = EXCLUDED.alpha_commission_rate,
  gcoin_v4_commission_rate = EXCLUDED.gcoin_v4_commission_rate,
  updated_at = now();

-- دالة لحساب عمولة الإحالة بناءً على المدير
CREATE OR REPLACE FUNCTION public.calculate_referral_commission(
  p_referrer_username TEXT,
  p_amount NUMERIC,
  p_currency_type TEXT
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  commission_rate NUMERIC;
  commission_amount NUMERIC;
BEGIN
  -- الحصول على نسبة العمولة للمدير
  IF p_currency_type = 'pepe' THEN
    SELECT pepe_commission_rate INTO commission_rate
    FROM public.manager_referral_commission_rates
    WHERE manager_telegram_username = p_referrer_username
    AND is_active = true;
  ELSIF p_currency_type = 'alpha' THEN
    SELECT alpha_commission_rate INTO commission_rate
    FROM public.manager_referral_commission_rates
    WHERE manager_telegram_username = p_referrer_username
    AND is_active = true;
  ELSIF p_currency_type = 'gcoin_v4' THEN
    SELECT gcoin_v4_commission_rate INTO commission_rate
    FROM public.manager_referral_commission_rates
    WHERE manager_telegram_username = p_referrer_username
    AND is_active = true;
  END IF;
  
  -- إذا لم يتم العثور على نسبة مخصصة، استخدم النسبة الافتراضية
  IF commission_rate IS NULL THEN
    -- النسبة الافتراضية للإحالات العادية
    IF p_currency_type = 'pepe' THEN
      commission_rate := 0.02; -- 2% افتراضي
    ELSIF p_currency_type = 'alpha' THEN
      commission_rate := 0.35; -- 35% من الموجود حالياً
    ELSIF p_currency_type = 'gcoin_v4' THEN
      commission_rate := 0.02; -- 2% افتراضي
    END IF;
  END IF;
  
  commission_amount := p_amount * commission_rate;
  
  RETURN commission_amount;
END;
$$;