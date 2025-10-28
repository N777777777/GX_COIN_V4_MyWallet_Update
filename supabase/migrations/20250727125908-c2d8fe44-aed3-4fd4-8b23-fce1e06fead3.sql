-- إعادة تعيين أرصدة العملات فقط إلى يوم 2025/07/24 الساعة 23 بالتوقيت العالمي

-- إنشاء نسخة احتياطية للحالة الحالية
CREATE TABLE IF NOT EXISTS coins_restore_24_july_23utc_backup (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    coins_before_restore_24_23utc NUMERIC,
    coins_after_restore_24_23utc NUMERIC,
    ton_balance_unchanged NUMERIC,
    restore_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restore_reason TEXT DEFAULT 'إعادة تعيين العملات إلى 24 يوليو 2025 الساعة 23 بالتوقيت العالمي'
);

-- حفظ الحالة الحالية قبل الإعادة
INSERT INTO coins_restore_24_july_23utc_backup (
    id, telegram_id, first_name, username, 
    coins_before_restore_24_23utc, ton_balance_unchanged
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(coins, 0) as coins_before_restore_24_23utc,
    COALESCE(ton_balance, 0) as ton_balance_unchanged
FROM telegram_users;

-- استرداد أرصدة العملات من النسخة الاحتياطية ليوم 24 يوليو
UPDATE telegram_users 
SET 
    coins = COALESCE(backup.coins_unchanged, 0),
    updated_at = NOW()
FROM ton_balance_restore_24_july_backup backup
WHERE telegram_users.id = backup.id;

-- تحديث النسخة الاحتياطية الجديدة بالقيم المُصححة
UPDATE coins_restore_24_july_23utc_backup 
SET 
    coins_after_restore_24_23utc = tu.coins
FROM telegram_users tu
WHERE coins_restore_24_july_23utc_backup.id = tu.id;

-- تقرير الاسترداد
DO $$
DECLARE
    total_users INTEGER;
    users_with_coins_before INTEGER;
    users_with_coins_after INTEGER;
    total_coins_before NUMERIC;
    total_coins_after NUMERIC;
    total_ton_unchanged NUMERIC;
    users_affected INTEGER;
BEGIN
    -- إحصائيات قبل وبعد الاسترداد
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN coins_before_restore_24_23utc > 0 THEN 1 END),
        COUNT(CASE WHEN coins_after_restore_24_23utc > 0 THEN 1 END),
        SUM(COALESCE(coins_before_restore_24_23utc, 0)),
        SUM(COALESCE(coins_after_restore_24_23utc, 0)),
        SUM(COALESCE(ton_balance_unchanged, 0))
    INTO 
        total_users, users_with_coins_before, users_with_coins_after,
        total_coins_before, total_coins_after, total_ton_unchanged
    FROM coins_restore_24_july_23utc_backup;
    
    -- عدد المستخدمين المتأثرين
    SELECT COUNT(*) INTO users_affected
    FROM coins_restore_24_july_23utc_backup
    WHERE coins_before_restore_24_23utc != coins_after_restore_24_23utc;
    
    RAISE NOTICE '========== تقرير استرداد أرصدة العملات إلى 24 يوليو 2025 الساعة 23 بالتوقيت العالمي ==========';
    RAISE NOTICE 'إجمالي المستخدمين: %', total_users;
    RAISE NOTICE 'المستخدمون الذين كان لديهم عملات قبل الاسترداد: %', users_with_coins_before;
    RAISE NOTICE 'المستخدمون الذين لديهم عملات بعد الاسترداد: %', users_with_coins_after;
    RAISE NOTICE 'إجمالي العملات قبل الاسترداد: %', total_coins_before;
    RAISE NOTICE 'إجمالي العملات بعد الاسترداد: %', total_coins_after;
    RAISE NOTICE 'المستخدمون المتأثرون: %', users_affected;
    RAISE NOTICE 'إجمالي TON (لم يتغير): %', total_ton_unchanged;
    RAISE NOTICE 'تاريخ الاسترداد المستهدف: 2025-07-24 23:00 UTC';
    RAISE NOTICE '================================================================';
    
    -- إظهار أكبر الأرصدة التي تم استردادها
    RAISE NOTICE 'أكبر 5 أرصدة عملات تم استردادها:';
    FOR i IN 1..5 LOOP
        DECLARE
            backup_record RECORD;
        BEGIN
            SELECT telegram_id, first_name, coins_after_restore_24_23utc
            INTO backup_record
            FROM coins_restore_24_july_23utc_backup
            WHERE coins_after_restore_24_23utc > 0
            ORDER BY coins_after_restore_24_23utc DESC
            LIMIT 1 OFFSET i-1;
            
            IF backup_record IS NOT NULL THEN
                RAISE NOTICE '%. المستخدم % (ID: %): % عملة', 
                    i, 
                    COALESCE(backup_record.first_name, 'غير محدد'), 
                    backup_record.telegram_id,
                    backup_record.coins_after_restore_24_23utc;
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '================================================================';
END $$;