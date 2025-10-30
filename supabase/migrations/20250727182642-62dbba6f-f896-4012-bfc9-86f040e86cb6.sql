-- إعادة تعيين أرصدة العملات وإعادة بناء الإحالات والسجلات المالية

-- 1. تعيين جميع أرصدة العملات إلى 0
UPDATE public.telegram_users 
SET coins = 0;

-- 2. حذف الإحالات الموجودة وإعادة بنائها
DELETE FROM public.user_referrals;

-- 3. إعادة بناء الإحالات من بيانات المستخدمين
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
    2, -- المكافأة الافتراضية للإحالة
    true,
    tu.created_at
FROM public.telegram_users tu
WHERE tu.referrer_telegram_id IS NOT NULL
ON CONFLICT (referrer_telegram_id, referred_telegram_id) DO NOTHING;

-- 4. استعادة أرصدة TON من النسخ الاحتياطية
UPDATE public.telegram_users 
SET ton_balance = COALESCE(backup.ton_balance_before_restore_26_23utc, 0)
FROM public.ton_balance_restore_26_july_23utc_backup backup
WHERE telegram_users.telegram_id = backup.telegram_id;

-- 5. إعادة إنشاء السجلات المالية الأساسية
INSERT INTO public.ton_purchases (
    telegram_user_id,
    ton_amount,
    coin_amount,
    status,
    verified,
    verification_status,
    completed_at
)
SELECT 
    tu.id,
    tu.ton_balance,
    0,
    'completed',
    true,
    'restored_from_backup',
    NOW()
FROM public.telegram_users tu
WHERE tu.ton_balance > 0
ON CONFLICT DO NOTHING;

-- 6. تحديث إحصائيات الإحالات
UPDATE public.telegram_users 
SET 
    total_referrals_count = COALESCE(ref_count.count, 0),
    total_referral_earnings = COALESCE(ref_count.count * 2, 0),
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