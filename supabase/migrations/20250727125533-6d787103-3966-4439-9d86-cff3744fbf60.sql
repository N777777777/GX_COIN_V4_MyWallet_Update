-- إعادة تعيين أرصدة TON إلى يوم 2025/07/26 الساعة 23 بالتوقيت العالمي

-- إنشاء نسخة احتياطية للحالة الحالية
CREATE TABLE IF NOT EXISTS ton_balance_restore_26_july_23utc_backup (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    ton_balance_before_restore_26_23utc NUMERIC,
    ton_balance_after_restore_26_23utc NUMERIC,
    coins_unchanged NUMERIC,
    restore_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restore_reason TEXT DEFAULT 'إعادة تعيين TON إلى 26 يوليو 2025 الساعة 23 بالتوقيت العالمي'
);

-- حفظ الحالة الحالية قبل الإعادة
INSERT INTO ton_balance_restore_26_july_23utc_backup (
    id, telegram_id, first_name, username, 
    ton_balance_before_restore_26_23utc, coins_unchanged
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(ton_balance, 0) as ton_balance_before_restore_26_23utc,
    COALESCE(coins, 0) as coins_unchanged
FROM telegram_users;

-- استرداد أرصدة TON من النسخة الاحتياطية ليوم 26 يوليو
UPDATE telegram_users 
SET 
    ton_balance = COALESCE(backup.ton_balance_after_restore, 0),
    updated_at = NOW()
FROM ton_balance_restore_26_july_backup backup
WHERE telegram_users.id = backup.id;

-- تحديث النسخة الاحتياطية الجديدة بالقيم المُصححة
UPDATE ton_balance_restore_26_july_23utc_backup 
SET 
    ton_balance_after_restore_26_23utc = tu.ton_balance
FROM telegram_users tu
WHERE ton_balance_restore_26_july_23utc_backup.id = tu.id;

-- تقرير الاسترداد
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
    -- إحصائيات قبل وبعد الاسترداد
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN ton_balance_before_restore_26_23utc > 0 THEN 1 END),
        COUNT(CASE WHEN ton_balance_after_restore_26_23utc > 0 THEN 1 END),
        SUM(COALESCE(ton_balance_before_restore_26_23utc, 0)),
        SUM(COALESCE(ton_balance_after_restore_26_23utc, 0)),
        SUM(COALESCE(coins_unchanged, 0))
    INTO 
        total_users, users_with_ton_before, users_with_ton_after,
        total_ton_before, total_ton_after, total_coins_unchanged
    FROM ton_balance_restore_26_july_23utc_backup;
    
    -- عدد المستخدمين المتأثرين
    SELECT COUNT(*) INTO users_affected
    FROM ton_balance_restore_26_july_23utc_backup
    WHERE ton_balance_before_restore_26_23utc != ton_balance_after_restore_26_23utc;
    
    RAISE NOTICE '========== تقرير استرداد أرصدة TON إلى 26 يوليو 2025 الساعة 23 بالتوقيت العالمي ==========';
    RAISE NOTICE 'إجمالي المستخدمين: %', total_users;
    RAISE NOTICE 'المستخدمون الذين كان لديهم TON قبل الاسترداد: %', users_with_ton_before;
    RAISE NOTICE 'المستخدمون الذين لديهم TON بعد الاسترداد: %', users_with_ton_after;
    RAISE NOTICE 'إجمالي TON قبل الاسترداد: %', total_ton_before;
    RAISE NOTICE 'إجمالي TON بعد الاسترداد: %', total_ton_after;
    RAISE NOTICE 'المستخدمون المتأثرون: %', users_affected;
    RAISE NOTICE 'إجمالي العملات (لم تتغير): %', total_coins_unchanged;
    RAISE NOTICE 'تاريخ الاسترداد المستهدف: 2025-07-26 23:00 UTC';
    RAISE NOTICE '================================================================';
    
    -- إظهار أكبر الأرصدة التي تم استردادها
    RAISE NOTICE 'أكبر 5 أرصدة TON تم استردادها:';
    FOR i IN 1..5 LOOP
        DECLARE
            backup_record RECORD;
        BEGIN
            SELECT telegram_id, first_name, ton_balance_after_restore_26_23utc
            INTO backup_record
            FROM ton_balance_restore_26_july_23utc_backup
            WHERE ton_balance_after_restore_26_23utc > 0
            ORDER BY ton_balance_after_restore_26_23utc DESC
            LIMIT 1 OFFSET i-1;
            
            IF backup_record IS NOT NULL THEN
                RAISE NOTICE '%. المستخدم % (ID: %): % TON', 
                    i, 
                    COALESCE(backup_record.first_name, 'غير محدد'), 
                    backup_record.telegram_id,
                    backup_record.ton_balance_after_restore_26_23utc;
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '================================================================';
END $$;