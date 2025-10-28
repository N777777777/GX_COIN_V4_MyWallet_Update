-- استعادة الأرصدة الحقيقية من نهاية يوم 26/07/2025

-- إنشاء نسخة احتياطية قبل الاستعادة النهائية
CREATE TABLE IF NOT EXISTS user_balance_final_restoration_backup (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    coins_before_final_restore NUMERIC,
    ton_balance_before_final_restore NUMERIC,
    coins_after_final_restore NUMERIC,
    ton_balance_after_final_restore NUMERIC,
    restoration_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- حفظ الحالة الحالية قبل الاستعادة النهائية
INSERT INTO user_balance_final_restoration_backup (
    id, telegram_id, first_name, username, 
    coins_before_final_restore, ton_balance_before_final_restore
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(coins, 0) as coins_before_final_restore, 
    COALESCE(ton_balance, 0) as ton_balance_before_final_restore
FROM telegram_users;

-- استعادة الأرصدة الحقيقية من نهاية يوم 26/07/2025
UPDATE telegram_users 
SET 
    coins = COALESCE(backup.coins_current, 0),
    ton_balance = COALESCE(backup.ton_balance_current, 0),
    updated_at = NOW()
FROM user_balance_backup_before_1am_egypt backup
WHERE telegram_users.telegram_id = backup.telegram_id;

-- تحديث النسخة الاحتياطية بالقيم المستعادة
UPDATE user_balance_final_restoration_backup 
SET 
    coins_after_final_restore = tu.coins,
    ton_balance_after_final_restore = tu.ton_balance
FROM telegram_users tu
WHERE user_balance_final_restoration_backup.id = tu.id;

-- تقرير الاستعادة النهائية
DO $$
DECLARE
    total_users_restored INTEGER;
    users_with_coins INTEGER;
    users_with_ton INTEGER;
    total_coins_restored NUMERIC;
    total_ton_restored NUMERIC;
    max_coins NUMERIC;
    max_ton NUMERIC;
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
        total_users_restored, users_with_coins, users_with_ton,
        total_coins_restored, total_ton_restored, max_coins, max_ton
    FROM telegram_users;
    
    RAISE NOTICE '===== تقرير الاستعادة النهائية =====';
    RAISE NOTICE 'إجمالي المستخدمين: %', total_users_restored;
    RAISE NOTICE 'المستخدمون الذين لديهم عملات: %', users_with_coins;
    RAISE NOTICE 'المستخدمون الذين لديهم TON: %', users_with_ton;
    RAISE NOTICE 'إجمالي العملات المستعادة: %', total_coins_restored;
    RAISE NOTICE 'إجمالي TON المستعاد: %', total_ton_restored;
    RAISE NOTICE 'أعلى رصيد عملات: %', max_coins;
    RAISE NOTICE 'أعلى رصيد TON: %', max_ton;
    RAISE NOTICE '=====================================';
END $$;