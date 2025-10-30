-- استعادة الأرصدة الحقيقية من user_balance_backup_before_1am_egypt
DO $$
DECLARE
    backup_record RECORD;
    user_record RECORD;
    restored_users INTEGER := 0;
    total_coins_restored NUMERIC := 0;
    total_ton_restored NUMERIC := 0;
BEGIN
    RAISE NOTICE '🔄 بدء استعادة الأرصدة الحقيقية من user_balance_backup_before_1am_egypt...';
    
    -- استعادة من النسخة الاحتياطية التي تحتوي على أرصدة حقيقية
    FOR backup_record IN 
        SELECT 
            telegram_id,
            first_name,
            username,
            coins_current,
            ton_balance_current
        FROM user_balance_backup_before_1am_egypt
        WHERE telegram_id IS NOT NULL
        AND (coins_current > 0 OR ton_balance_current > 0)
    LOOP
        -- البحث عن المستخدم في الجدول الحالي
        SELECT * INTO user_record
        FROM public.telegram_users
        WHERE telegram_id = backup_record.telegram_id;
        
        IF user_record IS NOT NULL THEN
            -- استعادة الأرصدة الحقيقية
            UPDATE public.telegram_users
            SET 
                coins = backup_record.coins_current,
                ton_balance = backup_record.ton_balance_current,
                last_active = NOW()
            WHERE telegram_id = backup_record.telegram_id;
            
            restored_users := restored_users + 1;
            total_coins_restored := total_coins_restored + COALESCE(backup_record.coins_current, 0);
            total_ton_restored := total_ton_restored + COALESCE(backup_record.ton_balance_current, 0);
            
            RAISE NOTICE '✅ استعادة أرصدة المستخدم: % - العملات: % - TON: %', 
                COALESCE(backup_record.first_name, backup_record.username, backup_record.telegram_id::text),
                COALESCE(backup_record.coins_current, 0),
                COALESCE(backup_record.ton_balance_current, 0);
        ELSE
            RAISE NOTICE '⚠️ المستخدم غير موجود: % (ID: %)', 
                COALESCE(backup_record.first_name, backup_record.username, 'غير محدد'),
                backup_record.telegram_id;
        END IF;
    END LOOP;
    
    -- نتائج العملية
    RAISE NOTICE '🎉 انتهت عملية الاستعادة بنجاح!';
    RAISE NOTICE '👥 عدد المستخدمين المستعادين: %', restored_users;
    RAISE NOTICE '🪙 إجمالي العملات المستعادة: %', total_coins_restored;
    RAISE NOTICE '💎 إجمالي TON المستعاد: %', total_ton_restored;
    RAISE NOTICE '⏰ وقت الاستعادة: %', NOW();
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ حدث خطأ أثناء الاستعادة: %', SQLERRM;
        ROLLBACK;
END $$;