-- إنشاء إحالات واقعية بناءً على النمط الزمني للمستخدمين من 26 يوليو

-- 1. حذف الإحالات الحالية
DELETE FROM public.user_referrals;

-- 2. تصفير referrer_telegram_id
UPDATE public.telegram_users SET referrer_telegram_id = NULL;

-- 3. إنشاء إحالات بناءً على النمط الزمني
-- المستخدمون القدامى (قبل 26 يوليو) يحيلون المستخدمين الجدد
WITH referral_pairs AS (
  SELECT 
    older_users.telegram_id as referrer_telegram_id,
    newer_users.telegram_id as referred_telegram_id,
    newer_users.created_at as referred_at,
    ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
  FROM public.telegram_users older_users
  CROSS JOIN public.telegram_users newer_users
  WHERE older_users.created_at <= '2025-07-26 23:59:59'::timestamp
    AND newer_users.created_at >= '2025-07-18 12:00:00'::timestamp
    AND newer_users.created_at <= '2025-07-26 23:59:59'::timestamp
    AND older_users.telegram_id != newer_users.telegram_id
),
selected_referrals AS (
  SELECT 
    referrer_telegram_id,
    referred_telegram_id,
    referred_at
  FROM referral_pairs
  WHERE rn <= (
    -- كل مستخدم قديم يحيل بين 0-5 مستخدمين (متوسط 2)
    SELECT COUNT(*) * 0.4 FROM public.telegram_users 
    WHERE created_at <= '2025-07-26 23:59:59'::timestamp
  )
)
INSERT INTO public.user_referrals (
  referrer_telegram_id,
  referred_telegram_id,
  reward_amount,
  reward_claimed,
  created_at
)
SELECT 
  referrer_telegram_id,
  referred_telegram_id,
  0, -- بدون مكافآت كما طلبت
  false,
  referred_at
FROM selected_referrals
ON CONFLICT (referrer_telegram_id, referred_telegram_id) DO NOTHING;

-- 4. تحديث referrer_telegram_id في جدول telegram_users
UPDATE public.telegram_users 
SET referrer_telegram_id = ur.referrer_telegram_id
FROM public.user_referrals ur
WHERE telegram_users.telegram_id = ur.referred_telegram_id;

-- 5. إعادة حساب إحصائيات الإحالات
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

-- 6. تصفير إحصائيات المستخدمين الذين لا يملكون إحالات
UPDATE public.telegram_users 
SET 
    total_referrals_count = 0,
    total_referral_earnings = 0,
    referral_tier = 'bronze'
WHERE telegram_id NOT IN (
    SELECT DISTINCT referrer_telegram_id 
    FROM public.user_referrals
);