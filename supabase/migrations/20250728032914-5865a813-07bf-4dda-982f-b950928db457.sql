-- مطابقة وإضافة النقاط من coins_restore_24_july_23utc_backup إلى telegram_users
DO $$
DECLARE
    backup_record RECORD;
    user_record RECORD;
    processed_users INTEGER := 0;
    total_coins_added NUMERIC := 0;
    users_updated INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 بدء عملية مطابقة وإضافة النقاط من coins_restore_24_july_23utc_backup...';
    
    -- المرور عبر جميع سجلات النسخة الاحتياطية
    FOR backup_record IN 
        SELECT 
            telegram_id,
            first_name,
            username,
            coins_after_restore_24_23utc as coins_to_add,
            ton_balance_unchanged
        FROM coins_restore_24_july_23utc_backup
        WHERE telegram_id IS NOT NULL
        AND coins_after_restore_24_23utc IS NOT NULL
        AND coins_after_restore_24_23utc > 0
    LOOP
        processed_users := processed_users + 1;
        
        -- البحث عن المستخدم في telegram_users
        SELECT * INTO user_record
        FROM public.telegram_users
        WHERE telegram_id = backup_record.telegram_id;
        
        IF user_record IS NOT NULL THEN
            -- إضافة النقاط للمستخدم الموجود
            UPDATE public.telegram_users
            SET 
                coins = COALESCE(coins, 0) + backup_record.coins_to_add,
                last_active = NOW()
            WHERE telegram_id = backup_record.telegram_id;
            
            users_updated := users_updated + 1;
            total_coins_added := total_coins_added + backup_record.coins_to_add;
            
            RAISE NOTICE '✅ تحديث المستخدم: % (ID: %) - أضيف: % عملة', 
                COALESCE(backup_record.first_name, backup_record.username, 'غير محدد'),
                backup_record.telegram_id,
                backup_record.coins_to_add;
        ELSE
            -- إنشاء مستخدم جديد إذا لم يكن موجوداً
            INSERT INTO public.telegram_users (
                telegram_id,
                first_name,
                username,
                coins,
                ton_balance,
                energy,
                energy_limit,
                coins_per_tap,
                energy_recharge_rate,
                created_at,
                last_active
            ) VALUES (
                backup_record.telegram_id,
                backup_record.first_name,
                backup_record.username,
                backup_record.coins_to_add,
                COALESCE(backup_record.ton_balance_unchanged, 0),
                1000,
                1000,
                1,
                1,
                NOW(),
                NOW()
            );
            
            users_updated := users_updated + 1;
            total_coins_added := total_coins_added + backup_record.coins_to_add;
            
            RAISE NOTICE '🆕 إنشاء مستخدم جديد: % (ID: %) - العملات: %', 
                COALESCE(backup_record.first_name, backup_record.username, 'غير محدد'),
                backup_record.telegram_id,
                backup_record.coins_to_add;
        END IF;
    END LOOP;
    
    -- نتائج العملية
    RAISE NOTICE '🎉 انتهت عملية المطابقة والإضافة بنجاح!';
    RAISE NOTICE '📊 السجلات المعالجة: %', processed_users;
    RAISE NOTICE '👥 المستخدمين المحدثين: %', users_updated;
    RAISE NOTICE '🪙 إجمالي العملات المضافة: %', total_coins_added;
    RAISE NOTICE '⏰ وقت المعالجة: %', NOW();
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ حدث خطأ أثناء المعالجة: %', SQLERRM;
        ROLLBACK;
END $$;