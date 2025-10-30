-- إرجاع الأرصدة إلى حالة يوم 25 يوليو 2025

-- إنشاء نسخة احتياطية للحالة الحالية
CREATE TABLE IF NOT EXISTS current_state_backup_before_july25_restore (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    coins_current NUMERIC,
    ton_balance_current NUMERIC,
    backup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    restore_reason TEXT DEFAULT 'النسخة الاحتياطية قبل إرجاع أرصدة يوم 25 يوليو'
);

-- حفظ الحالة الحالية
INSERT INTO current_state_backup_before_july25_restore (
    id, telegram_id, first_name, username, 
    coins_current, ton_balance_current
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(coins, 0), COALESCE(ton_balance, 0)
FROM telegram_users;

-- تحديث أرصدة المستخدمين الموجودين إلى حالة يوم 25
UPDATE telegram_users 
SET 
    coins = COALESCE(backup.coins_before_reset, 0),
    ton_balance = COALESCE(backup.ton_balance_before_reset, 0),
    updated_at = NOW()
FROM user_balance_backup_reset_to_25_july backup
WHERE telegram_users.telegram_id = backup.telegram_id;

-- إضافة المستخدمين المفقودين من نسخة يوم 25 (إذا وجدوا)
INSERT INTO telegram_users (
    telegram_id, first_name, username, coins, ton_balance, 
    created_at, updated_at, energy, energy_limit, coins_per_tap
)
SELECT DISTINCT
    backup.telegram_id,
    backup.first_name,
    backup.username,
    COALESCE(backup.coins_before_reset, 0) as coins,
    COALESCE(backup.ton_balance_before_reset, 0) as ton_balance,
    COALESCE(backup.reset_timestamp, NOW()) as created_at,
    NOW() as updated_at,
    1000 as energy,
    1000 as energy_limit,
    1 as coins_per_tap
FROM user_balance_backup_reset_to_25_july backup
WHERE backup.telegram_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM telegram_users tu 
        WHERE tu.telegram_id = backup.telegram_id
    );

-- تقرير النتائج
DO $$
DECLARE
    total_users_now INTEGER;
    total_users_backup INTEGER;
    total_coins_now NUMERIC;
    total_ton_now NUMERIC;
    total_coins_backup NUMERIC;
    total_ton_backup NUMERIC;
BEGIN
    -- حساب الإحصائيات الحالية
    SELECT 
        COUNT(*),
        SUM(COALESCE(coins, 0)),
        SUM(COALESCE(ton_balance, 0))
    INTO total_users_now, total_coins_now, total_ton_now
    FROM telegram_users;
    
    -- حساب إحصائيات النسخة الاحتياطية ليوم 25
    SELECT 
        COUNT(*),
        SUM(COALESCE(coins_before_reset, 0)),
        SUM(COALESCE(ton_balance_before_reset, 0))
    INTO total_users_backup, total_coins_backup, total_ton_backup
    FROM user_balance_backup_reset_to_25_july;
    
    RAISE NOTICE '========== تقرير استعادة البيانات إلى يوم 25 يوليو 2025 ==========';
    RAISE NOTICE 'المستخدمون في النسخة الاحتياطية ليوم 25: %', total_users_backup;
    RAISE NOTICE 'المستخدمون حالياً بعد الاستعادة: %', total_users_now;
    RAISE NOTICE 'إجمالي العملات في النسخة الاحتياطية: %', total_coins_backup;
    RAISE NOTICE 'إجمالي العملات الحالية: %', total_coins_now;
    RAISE NOTICE 'إجمالي TON في النسخة الاحتياطية: %', total_ton_backup;
    RAISE NOTICE 'إجمالي TON الحالي: %', total_ton_now;
    RAISE NOTICE 'تم إرجاع جميع الأرصدة إلى حالة يوم 25 يوليو 2025';
    RAISE NOTICE '=======================================================';
    
    -- عرض أكبر 5 أرصدة تم استردادها
    RAISE NOTICE 'أكبر 5 أرصدة تم استردادها:';
    FOR i IN 1..5 LOOP
        DECLARE
            user_record RECORD;
        BEGIN
            SELECT telegram_id, first_name, coins, ton_balance
            INTO user_record
            FROM telegram_users
            WHERE coins > 0 OR ton_balance > 0
            ORDER BY (coins + ton_balance) DESC
            LIMIT 1 OFFSET i-1;
            
            IF user_record IS NOT NULL THEN
                RAISE NOTICE '%. المستخدم % (ID: %): % عملة + % TON', 
                    i, 
                    COALESCE(user_record.first_name, 'غير محدد'), 
                    user_record.telegram_id,
                    user_record.coins,
                    user_record.ton_balance;
            END IF;
        END;
    END LOOP;
    
    RAISE NOTICE '=======================================================';
END $$;