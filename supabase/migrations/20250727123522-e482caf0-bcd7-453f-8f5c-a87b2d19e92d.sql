-- إرجاع رصيد TON فقط إلى حالة 26/07/2025 23:00 UTC

-- إنشاء نسخة احتياطية قبل تعديل TON
CREATE TABLE IF NOT EXISTS ton_balance_restore_26_july_backup (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    ton_balance_before_restore NUMERIC,
    ton_balance_after_restore NUMERIC,
    coins_unchanged NUMERIC,
    restore_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- حفظ الحالة الحالية لـ TON
INSERT INTO ton_balance_restore_26_july_backup (
    id, telegram_id, first_name, username, 
    ton_balance_before_restore, coins_unchanged
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(ton_balance, 0) as ton_balance_before_restore,
    COALESCE(coins, 0) as coins_unchanged
FROM telegram_users;

-- استعادة رصيد TON فقط من نسخة 26/07/2025 (مع الاحتفاظ بالعملات الحالية)
UPDATE telegram_users 
SET 
    ton_balance = COALESCE(backup.ton_balance_current, 0),
    updated_at = NOW()
FROM user_balance_backup_before_1am_egypt backup
WHERE telegram_users.telegram_id = backup.telegram_id;

-- تحديث النسخة الاحتياطية بالقيم المستعادة
UPDATE ton_balance_restore_26_july_backup 
SET 
    ton_balance_after_restore = tu.ton_balance
FROM telegram_users tu
WHERE ton_balance_restore_26_july_backup.id = tu.id;

-- تقرير استعادة TON فقط
DO $$
DECLARE
    users_with_ton_restored INTEGER;
    total_ton_restored NUMERIC;
    max_ton_restored NUMERIC;
    total_coins_unchanged NUMERIC;
BEGIN
    SELECT 
        COUNT(CASE WHEN ton_balance > 0 THEN 1 END),
        SUM(ton_balance),
        MAX(ton_balance),
        SUM(coins)
    INTO 
        users_with_ton_restored, total_ton_restored, max_ton_restored, total_coins_unchanged
    FROM telegram_users;
    
    RAISE NOTICE '===== تقرير استعادة TON إلى 26/07/2025 23:00 UTC =====';
    RAISE NOTICE 'المستخدمون الذين لديهم TON: %', users_with_ton_restored;
    RAISE NOTICE 'إجمالي TON المستعاد: %', total_ton_restored;
    RAISE NOTICE 'أعلى رصيد TON مستعاد: %', max_ton_restored;
    RAISE NOTICE 'إجمالي العملات (لم تتغير): %', total_coins_unchanged;
    RAISE NOTICE '=================================================';
END $$;