-- استعادة أرصدة المستخدمين من النسخة الاحتياطية الأحدث
-- فحص البيانات من جداول الـ backup واستعادة الأرصدة

DO $$
DECLARE
    backup_record RECORD;
    user_record RECORD;
    restored_users INTEGER := 0;
    total_coins_restored NUMERIC := 0;
    total_ton_restored NUMERIC := 0;
BEGIN
    RAISE NOTICE '🔄 بدء عملية استعادة الأرصدة من النسخ الاحتياطية...';
    
    -- استعادة من user_balance_backup_before_1am_egypt (أحدث نسخة)
    FOR backup_record IN 
        SELECT 
            telegram_id,
            first_name,
            username,
            coins_current,
            ton_balance_current
        FROM user_balance_backup_before_1am_egypt
        WHERE telegram_id IS NOT NULL
        AND (coins_current IS NOT NULL OR ton_balance_current IS NOT NULL)
    LOOP
        -- البحث عن المستخدم في الجدول الحالي
        SELECT * INTO user_record
        FROM public.telegram_users
        WHERE telegram_id = backup_record.telegram_id;
        
        IF user_record IS NOT NULL THEN
            -- استعادة الأرصدة
            UPDATE public.telegram_users
            SET 
                coins = COALESCE(backup_record.coins_current, coins),
                ton_balance = COALESCE(backup_record.ton_balance_current, ton_balance),
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
    
    -- إذا لم نجد بيانات كافية، نجرب backup آخر
    IF restored_users = 0 THEN
        RAISE NOTICE '🔄 محاولة الاستعادة من user_balance_backup_20250727_v4...';
        
        FOR backup_record IN 
            SELECT 
                telegram_id,
                first_name,
                username,
                coins_after as coins_current,
                ton_balance_after as ton_balance_current
            FROM user_balance_backup_20250727_v4
            WHERE telegram_id IS NOT NULL
            AND (coins_after IS NOT NULL OR ton_balance_after IS NOT NULL)
        LOOP
            -- البحث عن المستخدم في الجدول الحالي
            SELECT * INTO user_record
            FROM public.telegram_users
            WHERE telegram_id = backup_record.telegram_id;
            
            IF user_record IS NOT NULL THEN
                -- استعادة الأرصدة
                UPDATE public.telegram_users
                SET 
                    coins = COALESCE(backup_record.coins_current, coins),
                    ton_balance = COALESCE(backup_record.ton_balance_current, ton_balance),
                    last_active = NOW()
                WHERE telegram_id = backup_record.telegram_id;
                
                restored_users := restored_users + 1;
                total_coins_restored := total_coins_restored + COALESCE(backup_record.coins_current, 0);
                total_ton_restored := total_ton_restored + COALESCE(backup_record.ton_balance_current, 0);
                
                RAISE NOTICE '✅ استعادة أرصدة المستخدم: % - العملات: % - TON: %', 
                    COALESCE(backup_record.first_name, backup_record.username, backup_record.telegram_id::text),
                    COALESCE(backup_record.coins_current, 0),
                    COALESCE(backup_record.ton_balance_current, 0);
            END IF;
        END LOOP;
    END IF;
    
    -- إذا لم نجد بيانات كافية، نجرب final_coins_fix_backup
    IF restored_users = 0 THEN
        RAISE NOTICE '🔄 محاولة الاستعادة من final_coins_fix_backup...';
        
        FOR backup_record IN 
            SELECT 
                telegram_id,
                first_name,
                username,
                coins_after_fix as coins_current,
                ton_balance_unchanged as ton_balance_current
            FROM final_coins_fix_backup
            WHERE telegram_id IS NOT NULL
            AND coins_after_fix IS NOT NULL
        LOOP
            -- البحث عن المستخدم في الجدول الحالي
            SELECT * INTO user_record
            FROM public.telegram_users
            WHERE telegram_id = backup_record.telegram_id;
            
            IF user_record IS NOT NULL THEN
                -- استعادة العملات فقط (TON باقي كما هو)
                UPDATE public.telegram_users
                SET 
                    coins = backup_record.coins_current,
                    last_active = NOW()
                WHERE telegram_id = backup_record.telegram_id;
                
                restored_users := restored_users + 1;
                total_coins_restored := total_coins_restored + backup_record.coins_current;
                
                RAISE NOTICE '✅ استعادة عملات المستخدم: % - العملات: %', 
                    COALESCE(backup_record.first_name, backup_record.username, backup_record.telegram_id::text),
                    backup_record.coins_current;
            END IF;
        END LOOP;
    END IF;
    
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