-- إرجاع أرصدة المستخدمين من النسخة الاحتياطية الصحيحة
-- استخدام coins_before و ton_balance_before من user_balance_backup_20250727_v4

DO $$
DECLARE
    backup_record RECORD;
    affected_count INTEGER := 0;
BEGIN
    -- إرجاع الأرصدة من النسخة الاحتياطية الصحيحة
    FOR backup_record IN 
        SELECT DISTINCT ON (telegram_id) 
            telegram_id, coins_before, ton_balance_before
        FROM user_balance_backup_20250727_v4
        WHERE coins_before > 0 OR ton_balance_before > 0
        ORDER BY telegram_id, backup_created_at ASC
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