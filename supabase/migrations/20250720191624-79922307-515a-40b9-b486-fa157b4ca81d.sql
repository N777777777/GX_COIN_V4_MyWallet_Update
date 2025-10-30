-- إنشاء جدول لتسجيل مكافآت الإحالة اليومية
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_telegram_id BIGINT NOT NULL,
  referred_telegram_id BIGINT NOT NULL,
  coins_earned NUMERIC NOT NULL DEFAULT 0,
  referral_bonus NUMERIC NOT NULL DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- إنشاء index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer 
ON public.referral_earnings(referrer_telegram_id);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred 
ON public.referral_earnings(referred_telegram_id);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_date 
ON public.referral_earnings(earned_at);

-- تمكين Row Level Security
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات RLS
CREATE POLICY "Users can view their own referral earnings" 
ON public.referral_earnings 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert referral earnings" 
ON public.referral_earnings 
FOR INSERT 
WITH CHECK (true);

-- إضافة تعليق على الجدول
COMMENT ON TABLE public.referral_earnings IS 'تسجيل مكافآت الإحالة لكل نشاط من المدعوين';