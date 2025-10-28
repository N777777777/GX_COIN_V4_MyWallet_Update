-- إعادة تعيين أرصدة المستخدمين بناءً على تاريخ الانضمام
-- المستخدمون القدماء (قبل الساعة 1 صباحاً مصر) يحتفظون بأرصدة معقولة
-- المستخدمون الجدد يبدؤون من الصفر

DO $$
DECLARE
    user_record RECORD;
    base_coins NUMERIC;
    affected_count INTEGER := 0;
BEGIN
    -- إنشاء نسخة احتياطية جديدة
    CREATE TABLE IF NOT EXISTS user_balance_backup_before_1am_egypt (
        telegram_id BIGINT,
        first_name TEXT,
        username TEXT,
        coins_current NUMERIC,
        ton_balance_current NUMERIC,
        coins_reset NUMERIC,
        ton_balance_reset NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE,
        backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- معالجة كل مستخدم
    FOR user_record IN 
        SELECT telegram_id, first_name, username, coins, ton_balance, created_at
        FROM telegram_users
    LOOP
        -- تحديد الرصيد المناسب بناءً على تاريخ الانضمام
        IF user_record.created_at <= '2025-07-26 23:00:00+00:00' THEN
            -- المستخدمون القدماء: رصيد متدرج حسب التاريخ
            base_coins := GREATEST(0, EXTRACT(EPOCH FROM (TIMESTAMP '2025-07-26 23:00:00+00:00' - user_record.created_at)) / 86400 * 0.5);
            base_coins := LEAST(base_coins, 50); -- حد أقصى 50 عملة
        ELSE
            -- المستخدمون الجدد: يبدؤون من الصفر
            base_coins := 0;
        END IF;
        
        -- حفظ النسخة الاحتياطية
        INSERT INTO user_balance_backup_before_1am_egypt (
            telegram_id, first_name, username,
            coins_current, ton_balance_current,
            coins_reset, ton_balance_reset, created_at
        ) VALUES (
            user_record.telegram_id, user_record.first_name, user_record.username,
            user_record.coins, user_record.ton_balance,
            base_coins, 0, user_record.created_at
        );
        
        -- تحديث الرصيد
        UPDATE telegram_users 
        SET 
            coins = base_coins,
            ton_balance = 0,
            updated_at = NOW()
        WHERE telegram_id = user_record.telegram_id;
        
        affected_count := affected_count + 1;
    END LOOP;
    
    -- رسالة نهائية
    RAISE NOTICE 'تم إعادة تعيين أرصدة % مستخدم بناءً على تاريخ الانضمام', affected_count;
    
END $$;