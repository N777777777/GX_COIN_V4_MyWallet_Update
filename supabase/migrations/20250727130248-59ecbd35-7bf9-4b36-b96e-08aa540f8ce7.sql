-- استعادة جميع المستخدمين والأرصدة من النسخة الاحتياطية الأصلية

-- إنشاء نسخة احتياطية للحالة الحالية أولاً
CREATE TABLE IF NOT EXISTS recovery_backup_current_state (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    coins_current NUMERIC,
    ton_balance_current NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    backup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- حفظ الحالة الحالية
INSERT INTO recovery_backup_current_state (
    id, telegram_id, first_name, username, 
    coins_current, ton_balance_current, created_at
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(coins, 0), COALESCE(ton_balance, 0), created_at
FROM telegram_users;

-- استعادة المستخدمين المفقودين من النسخة الاحتياطية الأصلية
INSERT INTO telegram_users (
    telegram_id, first_name, username, coins, ton_balance, created_at, updated_at
)
SELECT DISTINCT
    backup.telegram_id,
    backup.first_name,
    backup.username,
    COALESCE(backup.coins_current, 0) as coins,
    COALESCE(backup.ton_balance_current, 0) as ton_balance,
    backup.created_at,
    NOW() as updated_at
FROM user_balance_backup_before_1am_egypt backup
WHERE backup.telegram_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM telegram_users tu 
        WHERE tu.telegram_id = backup.telegram_id
    );

-- تحديث المستخدمين الموجودين بالأرصدة الأصلية
UPDATE telegram_users 
SET 
    coins = COALESCE(backup.coins_current, 0),
    ton_balance = COALESCE(backup.ton_balance_current, 0),
    updated_at = NOW()
FROM user_balance_backup_before_1am_egypt backup
WHERE telegram_users.telegram_id = backup.telegram_id;

-- تقرير النتائج
DO $$
DECLARE
    total_users_now INTEGER;
    total_users_backup INTEGER;
    users_restored INTEGER;
    total_coins_now NUMERIC;
    total_ton_now NUMERIC;
BEGIN
    -- حساب الإحصائيات
    SELECT COUNT(*) INTO total_users_now FROM telegram_users;
    SELECT COUNT(*) INTO total_users_backup FROM user_balance_backup_before_1am_egypt;
    
    SELECT 
        SUM(COALESCE(coins, 0)),
        SUM(COALESCE(ton_balance, 0))
    INTO total_coins_now, total_ton_now
    FROM telegram_users;
    
    RAISE NOTICE '========== تقرير استعادة البيانات الكاملة ==========';
    RAISE NOTICE 'المستخدمون في النسخة الاحتياطية الأصلية: %', total_users_backup;
    RAISE NOTICE 'المستخدمون حالياً بعد الاستعادة: %', total_users_now;
    RAISE NOTICE 'إجمالي العملات المستعادة: %', total_coins_now;
    RAISE NOTICE 'إجمالي TON المستعاد: %', total_ton_now;
    RAISE NOTICE 'تم الاستعادة من النسخة الاحتياطية الأصلية قبل يوم 26';
    RAISE NOTICE '================================================';
END $$;