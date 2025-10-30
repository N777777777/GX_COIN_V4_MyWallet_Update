-- إنشاء جدول إعدادات الانزال الجوي
CREATE TABLE IF NOT EXISTS public.airdrop_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.airdrop_settings ENABLE ROW LEVEL SECURITY;

-- إنشاء policies
CREATE POLICY "Anyone can view airdrop settings"
ON public.airdrop_settings
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage airdrop settings"
ON public.airdrop_settings
FOR ALL
USING (true);

-- إدراج إعدادات افتراضية
INSERT INTO public.airdrop_settings (id, description, is_active)
VALUES (1, 'إعدادات الانزال الجوي الافتراضية', false)
ON CONFLICT (id) DO NOTHING;

-- إنشاء trigger للتحديث التلقائي للوقت
CREATE OR REPLACE FUNCTION public.update_airdrop_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_airdrop_settings_updated_at
BEFORE UPDATE ON public.airdrop_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_airdrop_updated_at();