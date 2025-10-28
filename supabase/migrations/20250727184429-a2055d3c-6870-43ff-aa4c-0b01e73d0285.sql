-- استعادة الإحالات من جدول referral_earnings

-- 1. حذف الإحالات الحالية
DELETE FROM public.user_referrals;

-- 2. إعادة بناء الإحالات من referral_earnings
INSERT INTO public.user_referrals (
    referrer_telegram_id,
    referred_telegram_id,
    reward_amount,
    reward_claimed,
    created_at
)
SELECT DISTINCT 
    re.referrer_telegram_id,
    re.referred_telegram_id,
    0, -- بدون مكافآت كما طلبت
    false, -- لم يتم المطالبة بها
    re.created_at
FROM public.referral_earnings re
WHERE EXISTS (
    SELECT 1 FROM public.telegram_users tu1 
    WHERE tu1.telegram_id = re.referrer_telegram_id
) AND EXISTS (
    SELECT 1 FROM public.telegram_users tu2 
    WHERE tu2.telegram_id = re.referred_telegram_id
)
ON CONFLICT (referrer_telegram_id, referred_telegram_id) DO NOTHING;

-- 3. تحديث referrer_telegram_id في جدول telegram_users
UPDATE public.telegram_users 
SET referrer_telegram_id = ur.referrer_telegram_id
FROM public.user_referrals ur
WHERE telegram_users.telegram_id = ur.referred_telegram_id;

-- 4. إعادة حساب إحصائيات الإحالات
UPDATE public.telegram_users 
SET 
    total_referrals_count = COALESCE(ref_count.count, 0),
    total_referral_earnings = 0, -- بدون أرباح
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

-- 5. تصفير إحصائيات المستخدمين الذين لا يملكون إحالات
UPDATE public.telegram_users 
SET 
    total_referrals_count = 0,
    total_referral_earnings = 0,
    referral_tier = 'bronze'
WHERE telegram_id NOT IN (
    SELECT DISTINCT referrer_telegram_id 
    FROM public.user_referrals
);