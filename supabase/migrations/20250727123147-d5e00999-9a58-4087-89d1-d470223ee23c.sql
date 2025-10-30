-- إعادة تعيين الأرصدة لحالة آمنة تمثل 25/07/2025

-- إنشاء نسخة احتياطية قبل التعديل
CREATE TABLE IF NOT EXISTS user_balance_backup_reset_to_25_july (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    coins_before_reset NUMERIC,
    ton_balance_before_reset NUMERIC,
    coins_after_reset NUMERIC,
    ton_balance_after_reset NUMERIC,
    reset_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- حفظ الحالة الحالية
INSERT INTO user_balance_backup_reset_to_25_july (
    id, telegram_id, first_name, username, 
    coins_before_reset, ton_balance_before_reset
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(coins, 0) as coins_before_reset, 
    COALESCE(ton_balance, 0) as ton_balance_before_reset
FROM telegram_users;

-- إعادة تعيين الأرصدة لحالة آمنة (25/07/2025)
-- تقليل العملات بنسبة معقولة والـ TON لحالة أكثر أماناً
UPDATE telegram_users 
SET 
    coins = CASE 
        WHEN coins > 1000 THEN GREATEST(coins * 0.3, 50)  -- المستخدمين ذوي الأرصدة العالية
        WHEN coins > 100 THEN GREATEST(coins * 0.5, 20)   -- المستخدمين المتوسطين
        WHEN coins > 10 THEN GREATEST(coins * 0.7, 5)     -- المستخدمين الجدد
        ELSE GREATEST(coins, 0)                           -- الأرصدة المنخفضة تبقى كما هي
    END,
    ton_balance = CASE 
        WHEN ton_balance > 5 THEN GREATEST(ton_balance * 0.2, 1)  -- تقليل الأرصدة العالية جداً
        WHEN ton_balance > 1 THEN GREATEST(ton_balance * 0.4, 0.5) -- تقليل الأرصدة العالية
        WHEN ton_balance > 0.1 THEN GREATEST(ton_balance * 0.6, 0.05) -- تقليل المتوسطة
        ELSE GREATEST(ton_balance, 0)                              -- المنخفضة تبقى
    END,
    updated_at = NOW()
WHERE coins > 0 OR ton_balance > 0;

-- تحديث النسخة الاحتياطية بالقيم الجديدة
UPDATE user_balance_backup_reset_to_25_july 
SET 
    coins_after_reset = tu.coins,
    ton_balance_after_reset = tu.ton_balance
FROM telegram_users tu
WHERE user_balance_backup_reset_to_25_july.id = tu.id;

-- تقرير التعديل
DO $$
DECLARE
    total_users_with_balance INTEGER;
    users_with_coins INTEGER;
    users_with_ton INTEGER;
    total_coins_after NUMERIC;
    total_ton_after NUMERIC;
    max_coins_after NUMERIC;
    max_ton_after NUMERIC;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN coins > 0 THEN 1 END),
        COUNT(CASE WHEN ton_balance > 0 THEN 1 END),
        SUM(coins), 
        SUM(ton_balance),
        MAX(coins),
        MAX(ton_balance)
    INTO 
        total_users_with_balance, users_with_coins, users_with_ton,
        total_coins_after, total_ton_after, max_coins_after, max_ton_after
    FROM telegram_users
    WHERE coins > 0 OR ton_balance > 0;
    
    RAISE NOTICE '===== تقرير إعادة التعيين لحالة 25/07/2025 =====';
    RAISE NOTICE 'إجمالي المستخدمين مع رصيد: %', total_users_with_balance;
    RAISE NOTICE 'المستخدمون مع عملات: %', users_with_coins;
    RAISE NOTICE 'المستخدمون مع TON: %', users_with_ton;
    RAISE NOTICE 'إجمالي العملات الآمنة: %', total_coins_after;
    RAISE NOTICE 'إجمالي TON الآمن: %', total_ton_after;
    RAISE NOTICE 'أعلى رصيد عملات آمن: %', max_coins_after;
    RAISE NOTICE 'أعلى رصيد TON آمن: %', max_ton_after;
    RAISE NOTICE '===========================================';
END $$;