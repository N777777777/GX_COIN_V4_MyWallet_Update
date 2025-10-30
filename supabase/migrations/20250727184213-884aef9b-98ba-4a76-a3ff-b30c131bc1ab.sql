-- استعادة بيانات الإحالات من جدول user_referrals

-- 1. تحديث referrer_telegram_id في جدول telegram_users بناءً على user_referrals
UPDATE public.telegram_users 
SET referrer_telegram_id = ur.referrer_telegram_id
FROM public.user_referrals ur
WHERE telegram_users.telegram_id = ur.referred_telegram_id
  AND telegram_users.referrer_telegram_id IS NULL;

-- 2. إعادة حساب إحصائيات الإحالات
UPDATE public.telegram_users 
SET 
    total_referrals_count = COALESCE(ref_count.count, 0),
    total_referral_earnings = 0, -- نحافظ على عدم وجود أرباح
    referral_tier = CASE 
        WHEN COALESCE(ref_count.count, 0) >= 100 THEN 'diamond'
        WHEN COALESCE(ref_count.count, 0) >= 50 THEN 'gold'
        WHEN COALESCE(ref_count.count, 0) >= 20 THEN 'silver'
        ELSE 'bronze'
    END
FROM (
    SELECT 
        referrer_telegram_id,
        COUNT(*) as count
    FROM public.user_referrals
    GROUP BY referrer_telegram_id
) ref_count
WHERE telegram_users.telegram_id = ref_count.referrer_telegram_id;

-- 3. تصفير إحصائيات المستخدمين الذين لا يملكون إحالات
UPDATE public.telegram_users 
SET 
    total_referrals_count = 0,
    total_referral_earnings = 0,
    referral_tier = 'bronze'
WHERE telegram_id NOT IN (
    SELECT DISTINCT referrer_telegram_id 
    FROM public.user_referrals
);