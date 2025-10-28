-- إصلاح الخطأ الذي حدث لجميع المستخدمين
-- إرجاع الأرصدة إلى حالتها الصحيحة قبل التحديث الخاطئ

DO $$
DECLARE
    user_record RECORD;
    backup_record RECORD;
    affected_count INTEGER := 0;
BEGIN
    -- إنشاء جدول النسخ الاحتياطية إذا لم يكن موجوداً
    CREATE TABLE IF NOT EXISTS user_balance_backup_20250727_v4 (
        id UUID,
        telegram_id BIGINT,
        username TEXT,
        first_name TEXT,
        coins_before NUMERIC,
        ton_balance_before NUMERIC,
        coins_after NUMERIC,
        ton_balance_after NUMERIC,
        updated_at TIMESTAMP WITH TIME ZONE,
        backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- إصلاح الأرصدة للمستخدمين المتأثرين
    FOR user_record IN 
        SELECT * FROM telegram_users 
        WHERE updated_at >= '2025-01-27 02:40:00+00:00'
    LOOP
        -- البحث عن النسخة الاحتياطية السابقة
        SELECT * INTO backup_record 
        FROM user_balance_backup_20250727_v3 
        WHERE telegram_id = user_record.telegram_id;
        
        IF backup_record IS NOT NULL THEN
            -- نسخ البيانات الحالية كنسخة احتياطية
            INSERT INTO user_balance_backup_20250727_v4 (
                id, telegram_id, username, first_name,
                coins_before, ton_balance_before,
                coins_after, ton_balance_after, updated_at
            ) VALUES (
                user_record.id, user_record.telegram_id, user_record.username, user_record.first_name,
                user_record.coins, user_record.ton_balance,
                backup_record.coins_before, backup_record.ton_balance_before,
                user_record.updated_at
            );
            
            -- إرجاع الرصيد إلى الحالة الصحيحة من النسخة الاحتياطية
            UPDATE telegram_users 
            SET 
                coins = backup_record.coins_before,
                ton_balance = backup_record.ton_balance_before,
                updated_at = NOW()
            WHERE id = user_record.id;
            
            affected_count := affected_count + 1;
            
        ELSE
            -- إذا لم توجد نسخة احتياطية، إعادة تعيين الرصيد إلى 0
            INSERT INTO user_balance_backup_20250727_v4 (
                id, telegram_id, username, first_name,
                coins_before, ton_balance_before,
                coins_after, ton_balance_after, updated_at
            ) VALUES (
                user_record.id, user_record.telegram_id, user_record.username, user_record.first_name,
                user_record.coins, user_record.ton_balance,
                0, 0, user_record.updated_at
            );
            
            UPDATE telegram_users 
            SET 
                coins = 0,
                ton_balance = 0,
                updated_at = NOW()
            WHERE id = user_record.id;
            
            affected_count := affected_count + 1;
        END IF;
    END LOOP;
    
    -- رسالة نهائية
    RAISE NOTICE 'تم إصلاح أرصدة % مستخدم بنجاح', affected_count;
    
END $$;