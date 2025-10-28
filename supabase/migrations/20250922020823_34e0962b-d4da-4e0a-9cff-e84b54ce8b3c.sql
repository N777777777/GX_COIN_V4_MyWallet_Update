-- إنشاء جدول إعدادات العمولات
CREATE TABLE IF NOT EXISTS public.commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_type TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC NOT NULL DEFAULT 0.0,
  currency_type TEXT NOT NULL DEFAULT 'alpha_coins',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

-- السماح للجميع بقراءة إعدادات العمولات النشطة
CREATE POLICY "Anyone can view active commission settings" 
ON public.commission_settings 
FOR SELECT 
USING (is_active = true);

-- السماح لدور الخدمة بإدارة جميع الإعدادات
CREATE POLICY "Service role can manage commission settings" 
ON public.commission_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- إدراج الإعدادات الافتراضية
INSERT INTO public.commission_settings (commission_type, commission_rate, currency_type, description) VALUES
('referral', 0.35, 'alpha_coins', 'عمولة الإحالات - 35%'),
('g_coin_v4', 0.05, 'g_coin', 'عمولة عملات G COIN V4 - 5%'),
('alpha_coins', 0.03, 'alpha_coins', 'عمولة عملات الألفا - 3%')
ON CONFLICT (commission_type) DO UPDATE SET
  commission_rate = EXCLUDED.commission_rate,
  currency_type = EXCLUDED.currency_type,
  description = EXCLUDED.description,
  updated_at = now();

-- إنشاء دالة للحصول على معدل العمولة
CREATE OR REPLACE FUNCTION public.get_commission_rate(p_commission_type TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rate NUMERIC;
BEGIN
  SELECT commission_rate INTO rate
  FROM public.commission_settings
  WHERE commission_type = p_commission_type
  AND is_active = true;
  
  RETURN COALESCE(rate, 0.0);
END;
$$;