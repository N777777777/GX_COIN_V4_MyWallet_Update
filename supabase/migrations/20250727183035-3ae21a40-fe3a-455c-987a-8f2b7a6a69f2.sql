-- إعادة بناء الإحالات بدون مكافآت

-- 1. حذف الإحالات الموجودة
DELETE FROM public.user_referrals;

-- 2. إعادة بناء الإحالات من بيانات المستخدمين بدون مكافآت
INSERT INTO public.user_referrals (
    referrer_telegram_id,
    referred_telegram_id,
    reward_amount,
    reward_claimed,
    created_at
)
SELECT DISTINCT 
    tu.referrer_telegram_id,
    tu.telegram_id,
    0, -- بدون مكافآت
    false, -- لم يتم المطالبة بها
    tu.created_at
FROM public.telegram_users tu
WHERE tu.referrer_telegram_id IS NOT NULL
  AND tu.referrer_telegram_id != tu.telegram_id -- تجنب الإحالة الذاتية
  AND EXISTS (
    SELECT 1 FROM public.telegram_users referrer 
    WHERE referrer.telegram_id = tu.referrer_telegram_id
  ) -- التأكد من وجود المُحيل
ON CONFLICT (referrer_telegram_id, referred_telegram_id) DO NOTHING;

-- 3. تحديث إحصائيات الإحالات بدون مكافآت مالية
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

-- 4. تصفير إحصائيات المستخدمين الذين لا يملكون إحالات
UPDATE public.telegram_users 
SET 
    total_referrals_count = 0,
    total_referral_earnings = 0,
    referral_tier = 'bronze'
WHERE telegram_id NOT IN (
    SELECT DISTINCT referrer_telegram_id 
    FROM public.user_referrals
);