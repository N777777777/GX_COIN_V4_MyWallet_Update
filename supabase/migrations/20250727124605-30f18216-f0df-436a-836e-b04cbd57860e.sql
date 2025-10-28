-- إعادة تعيين أرصدة TON فقط إلى يوم 2025/07/24 الساعة 23:00 بالتوقيت العالمي

-- إنشاء نسخة احتياطية لأرصدة TON الحالية قبل الإعادة
CREATE TABLE IF NOT EXISTS ton_balance_restore_24_july_backup (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    ton_balance_before_restore NUMERIC,
    ton_balance_after_restore NUMERIC,
    coins_unchanged NUMERIC,
    restore_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restore_reason TEXT DEFAULT 'إعادة تعيين TON إلى 24 يوليو 2025 الساعة 23:00 بالتوقيت العالمي'
);

-- حفظ الحالة الحالية قبل الإعادة
INSERT INTO ton_balance_restore_24_july_backup (
    id, telegram_id, first_name, username, 
    ton_balance_before_restore, coins_unchanged
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(ton_balance, 0) as ton_balance_before_restore,
    COALESCE(coins, 0) as coins_unchanged
FROM telegram_users;

-- إعادة تعيين جميع أرصدة TON إلى 0 (الحالة في 24 يوليو قبل أي إيداعات)
UPDATE telegram_users 
SET 
    ton_balance = 0,
    updated_at = NOW()
WHERE ton_balance > 0;

-- تحديث النسخة الاحتياطية بالقيم المُصححة
UPDATE ton_balance_restore_24_july_backup 
SET 
    ton_balance_after_restore = tu.ton_balance
FROM telegram_users tu
WHERE ton_balance_restore_24_july_backup.id = tu.id;

-- تقرير الإعادة
DO $$
DECLARE
    total_users INTEGER;
    users_with_ton_before INTEGER;
    users_with_ton_after INTEGER;
    total_ton_before NUMERIC;
    total_ton_after NUMERIC;
    total_coins_unchanged NUMERIC;
    users_affected INTEGER;
BEGIN
    -- إحصائيات قبل وبعد الإعادة
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN ton_balance_before_restore > 0 THEN 1 END),
        COUNT(CASE WHEN ton_balance_after_restore > 0 THEN 1 END),
        SUM(COALESCE(ton_balance_before_restore, 0)),
        SUM(COALESCE(ton_balance_after_restore, 0)),
        SUM(COALESCE(coins_unchanged, 0))
    INTO 
        total_users, users_with_ton_before, users_with_ton_after,
        total_ton_before, total_ton_after, total_coins_unchanged
    FROM ton_balance_restore_24_july_backup;
    
    -- عدد المستخدمين المتأثرين
    SELECT COUNT(*) INTO users_affected
    FROM ton_balance_restore_24_july_backup
    WHERE ton_balance_before_restore != ton_balance_after_restore;
    
    RAISE NOTICE '========== تقرير إعادة تعيين أرصدة TON إلى 24 يوليو 2025 ==========';
    RAISE NOTICE 'إجمالي المستخدمين: %', total_users;
    RAISE NOTICE 'المستخدمون الذين كان لديهم TON قبل الإعادة: %', users_with_ton_before;
    RAISE NOTICE 'المستخدمون الذين لديهم TON بعد الإعادة: %', users_with_ton_after;
    RAISE NOTICE 'إجمالي TON قبل الإعادة: %', total_ton_before;
    RAISE NOTICE 'إجمالي TON بعد الإعادة: %', total_ton_after;
    RAISE NOTICE 'المستخدمون المتأثرون: %', users_affected;
    RAISE NOTICE 'إجمالي العملات (لم تتغير): %', total_coins_unchanged;
    RAISE NOTICE 'تاريخ الإعادة المستهدف: 2025-07-24 23:00:00 UTC';
    RAISE NOTICE '================================================================';
    
    -- إظهار أكبر الأرصدة التي تم إعادة تعيينها
    RAISE NOTICE 'أكبر 5 أرصدة TON تم إعادة تعيينها:';
    FOR i IN 1..5 LOOP
        DECLARE
            backup_record RECORD;
        BEGIN
            SELECT telegram_id, first_name, ton_balance_before_restore
            INTO backup_record
            FROM ton_balance_restore_24_july_backup
            WHERE ton_balance_before_restore > 0
            ORDER BY ton_balance_before_restore DESC
            LIMIT 1 OFFSET i-1;
            
            IF backup_record IS NOT NULL THEN
                RAISE NOTICE '%. المستخدم % (ID: %): % TON', 
                    i, 
                    COALESCE(backup_record.first_name, 'غير محدد'), 
                    backup_record.telegram_id,
                    backup_record.ton_balance_before_restore;
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '================================================================';
END $$;