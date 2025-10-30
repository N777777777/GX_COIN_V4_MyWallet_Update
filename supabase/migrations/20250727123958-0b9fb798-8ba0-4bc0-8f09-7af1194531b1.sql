-- إعادة تعيين أرصدة العملات بشكل صحيح ومتسق

-- إنشاء نسخة احتياطية شاملة قبل الإصلاح النهائي
CREATE TABLE IF NOT EXISTS final_coins_fix_backup (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    coins_before_fix NUMERIC,
    coins_after_fix NUMERIC,
    ton_balance_unchanged NUMERIC,
    fix_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fix_reason TEXT DEFAULT 'إصلاح التناقضات في أرصدة العملات'
);

-- حفظ الحالة الحالية قبل الإصلاح
INSERT INTO final_coins_fix_backup (
    id, telegram_id, first_name, username, 
    coins_before_fix, ton_balance_unchanged
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(coins, 0) as coins_before_fix,
    COALESCE(ton_balance, 0) as ton_balance_unchanged
FROM telegram_users;

-- إعادة تعيين العملات للحالة الصحيحة من النسخة الاحتياطية
-- استخدام coins_reset من النسخة الاحتياطية الموثوقة
UPDATE telegram_users 
SET 
    coins = COALESCE(backup.coins_reset, 0),
    updated_at = NOW()
FROM user_balance_backup_before_1am_egypt backup
WHERE telegram_users.telegram_id = backup.telegram_id;

-- للمستخدمين الجدد الذين لا يوجدون في النسخة الاحتياطية، إعطاؤهم رصيد ابتدائي آمن
UPDATE telegram_users 
SET 
    coins = 1.0,  -- رصيد ابتدائي آمن للمستخدمين الجدد
    updated_at = NOW()
WHERE telegram_id NOT IN (
    SELECT telegram_id FROM user_balance_backup_before_1am_egypt 
    WHERE telegram_id IS NOT NULL
)
AND (coins IS NULL OR coins = 0);

-- تحديث النسخة الاحتياطية بالقيم المُصححة
UPDATE final_coins_fix_backup 
SET 
    coins_after_fix = tu.coins
FROM telegram_users tu
WHERE final_coins_fix_backup.id = tu.id;

-- تقرير الإصلاح النهائي
DO $$
DECLARE
    total_users INTEGER;
    users_with_coins INTEGER;
    total_coins_after_fix NUMERIC;
    avg_coins_after_fix NUMERIC;
    max_coins_after_fix NUMERIC;
    min_coins_after_fix NUMERIC;
    users_from_backup INTEGER;
    users_new INTEGER;
BEGIN
    -- إحصائيات عامة
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN coins > 0 THEN 1 END),
        SUM(coins),
        AVG(coins),
        MAX(coins),
        MIN(coins)
    INTO 
        total_users, users_with_coins, total_coins_after_fix, 
        avg_coins_after_fix, max_coins_after_fix, min_coins_after_fix
    FROM telegram_users;
    
    -- عدد المستخدمين من النسخة الاحتياطية
    SELECT COUNT(*) INTO users_from_backup
    FROM telegram_users tu
    WHERE EXISTS (
        SELECT 1 FROM user_balance_backup_before_1am_egypt backup 
        WHERE backup.telegram_id = tu.telegram_id
    );
    
    users_new := total_users - users_from_backup;
    
    RAISE NOTICE '========== تقرير الإصلاح النهائي لأرصدة العملات ==========';
    RAISE NOTICE 'إجمالي المستخدمين: %', total_users;
    RAISE NOTICE 'المستخدمون الذين لديهم عملات: %', users_with_coins;
    RAISE NOTICE 'المستخدمون المستعادون من النسخة الاحتياطية: %', users_from_backup;
    RAISE NOTICE 'المستخدمون الجدد (رصيد ابتدائي): %', users_new;
    RAISE NOTICE 'إجمالي العملات بعد الإصلاح: %', total_coins_after_fix;
    RAISE NOTICE 'متوسط العملات: %', ROUND(avg_coins_after_fix, 2);
    RAISE NOTICE 'أقل رصيد: %', min_coins_after_fix;
    RAISE NOTICE 'أعلى رصيد: %', max_coins_after_fix;
    RAISE NOTICE '=======================================================';
    
    -- فحص التوزيع الجديد
    RAISE NOTICE 'فحص التوزيع الجديد:';
    FOR i IN 1..5 LOOP
        CASE i
            WHEN 1 THEN 
                SELECT COUNT(*) INTO users_new FROM telegram_users WHERE coins = 0;
                RAISE NOTICE 'مستخدمون برصيد 0: %', users_new;
            WHEN 2 THEN 
                SELECT COUNT(*) INTO users_new FROM telegram_users WHERE coins > 0 AND coins <= 5;
                RAISE NOTICE 'مستخدمون برصيد 1-5 عملات: %', users_new;
            WHEN 3 THEN 
                SELECT COUNT(*) INTO users_new FROM telegram_users WHERE coins > 5 AND coins <= 10;
                RAISE NOTICE 'مستخدمون برصيد 6-10 عملات: %', users_new;
            WHEN 4 THEN 
                SELECT COUNT(*) INTO users_new FROM telegram_users WHERE coins > 10 AND coins <= 50;
                RAISE NOTICE 'مستخدمون برصيد 11-50 عملة: %', users_new;
            WHEN 5 THEN 
                SELECT COUNT(*) INTO users_new FROM telegram_users WHERE coins > 50;
                RAISE NOTICE 'مستخدمون برصيد أكثر من 50 عملة: %', users_new;
        END CASE;
    END LOOP;
    
    RAISE NOTICE '=======================================================';
END $$;