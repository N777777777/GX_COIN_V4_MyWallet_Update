-- إعادة تعيين جميع الأرصدة إلى الصفر
UPDATE public.telegram_users 
SET 
  coins = 0,
  ton_balance = 0,
  total_referral_earnings = 0,
  total_referrals_count = 0,
  referral_tier = 'bronze'
WHERE true;

-- تسجيل الحدث في جدول الأمان
INSERT INTO public.security_logs (
  access_source,
  security_flags,
  created_at
) VALUES (
  'system_reset',
  ARRAY['BALANCE_RESET', 'SECURITY_ISSUE'],
  NOW()
);