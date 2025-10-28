-- استعادة أرصدة المستخدمين من النسخة الاحتياطية الصحيحة

-- إنشاء جدول نسخة احتياطية جديدة قبل الاستعادة
CREATE TABLE IF NOT EXISTS user_balance_backup_20250727_v4 (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    coins_before NUMERIC,
    ton_balance_before NUMERIC,
    coins_after NUMERIC,
    ton_balance_after NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE,
    backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- حفظ الحالة الحالية قبل الاستعادة
INSERT INTO user_balance_backup_20250727_v4 (
    id, telegram_id, first_name, username, 
    coins_before, ton_balance_before, updated_at
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(coins, 0) as coins_before, 
    COALESCE(ton_balance, 0) as ton_balance_before, 
    updated_at
FROM telegram_users;

-- استعادة الأرصدة من النسخة الاحتياطية قبل الساعة 1 صباحاً
UPDATE telegram_users 
SET 
    coins = COALESCE(backup.coins_reset, 0),
    ton_balance = COALESCE(backup.ton_balance_reset, 0),
    updated_at = NOW()
FROM user_balance_backup_before_1am_egypt backup
WHERE telegram_users.telegram_id = backup.telegram_id;

-- تحديث النسخة الاحتياطية الجديدة بالقيم المستعادة
UPDATE user_balance_backup_20250727_v4 
SET 
    coins_after = tu.coins,
    ton_balance_after = tu.ton_balance
FROM telegram_users tu
WHERE user_balance_backup_20250727_v4.id = tu.id;

-- تقرير الاستعادة
DO $$
DECLARE
    restored_count INTEGER;
    total_coins NUMERIC;
    total_ton NUMERIC;
BEGIN
    SELECT COUNT(*), SUM(coins), SUM(ton_balance) 
    INTO restored_count, total_coins, total_ton
    FROM telegram_users 
    WHERE coins > 0 OR ton_balance > 0;
    
    RAISE NOTICE 'تم استعادة أرصدة المستخدمين بنجاح';
    RAISE NOTICE 'عدد المستخدمين مع رصيد: %', restored_count;
    RAISE NOTICE 'إجمالي العملات المستعادة: %', total_coins;
    RAISE NOTICE 'إجمالي TON المستعاد: %', total_ton;
END $$;