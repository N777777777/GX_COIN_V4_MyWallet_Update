-- إرجاع أرصدة المستخدمين كما كانت الساعة 5 صباحاً بتوقيت مصر (3 صباحاً UTC)
-- استخدام النسخة الاحتياطية الأصلية user_balance_backup_20250727_v3

DO $$
DECLARE
    backup_record RECORD;
    affected_count INTEGER := 0;
BEGIN
    -- إرجاع الأرصدة من النسخة الاحتياطية الأصلية
    FOR backup_record IN 
        SELECT * FROM user_balance_backup_20250727_v3
    LOOP
        -- تحديث رصيد المستخدم من النسخة الاحتياطية
        UPDATE telegram_users 
        SET 
            coins = backup_record.coins_before,
            ton_balance = backup_record.ton_balance_before,
            updated_at = NOW()
        WHERE telegram_id = backup_record.telegram_id;
        
        -- التأكد من أن التحديث تم بنجاح
        IF FOUND THEN
            affected_count := affected_count + 1;
        END IF;
    END LOOP;
    
    -- رسالة نهائية
    RAISE NOTICE 'تم إرجاع أرصدة % مستخدم كما كانت الساعة 5 صباحاً بتوقيت مصر', affected_count;
    
END $$;