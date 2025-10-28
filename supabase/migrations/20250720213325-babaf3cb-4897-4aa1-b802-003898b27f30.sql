-- سكريبت لإعطاء مستخدم معين التأهيل + 0.64 TON + 10 عملات
-- ضع telegram_id المطلوب في المتغير أدناه
DO $$
DECLARE
    target_telegram_id BIGINT := 138370; -- ⬅️ ضع هنا telegram_id للمستخدم
    user_record RECORD;
    auto_uid TEXT;
    old_ton_balance NUMERIC;
    old_coins NUMERIC;
    new_ton_balance NUMERIC;
    new_coins NUMERIC;
BEGIN
    -- البحث عن المستخدم
    SELECT * INTO user_record 
    FROM public.telegram_users 
    WHERE telegram_id = target_telegram_id;
    
    -- التحقق من وجود المستخدم
    IF user_record IS NULL THEN
        RAISE NOTICE '❌ المستخدم غير موجود مع ID: %', target_telegram_id;
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ تم العثور على المستخدم: % (ID: %)', 
        COALESCE(user_record.first_name, user_record.username, target_telegram_id::text), 
        target_telegram_id;
    
    -- التحقق من عدم إكمال مهمة KuCoin مسبقاً
    IF EXISTS (
        SELECT 1 FROM public.completed_tasks 
        WHERE telegram_user_id = user_record.id 
        AND task_id = '6'
    ) THEN
        RAISE NOTICE '⚠️ المستخدم أكمل مهمة KuCoin مسبقاً، سيتم فقط إضافة TON والعملات';
    ELSE
        -- إنشاء UID تلقائي وإضافة مهمة KuCoin
        auto_uid := 'SCRIPT_' || target_telegram_id || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
        
        INSERT INTO public.completed_tasks (
            telegram_user_id,
            task_id,
            task_title,
            task_type,
            reward_amount,
            uid,
            campaign_link,
            completed_at
        ) VALUES (
            user_record.id,
            '6',
            'KUCOIN',
            'platform',
            10,
            auto_uid,
            'https://t.me/KingsCrypto770/9185',
            NOW()
        );
        
        RAISE NOTICE '✅ تم إضافة مهمة KuCoin للتأهيل';
    END IF;
    
    -- حفظ الأرصدة الحالية
    old_ton_balance := COALESCE(user_record.ton_balance, 0);
    old_coins := COALESCE(user_record.coins, 0);
    new_ton_balance := old_ton_balance + 0.64;
    new_coins := old_coins + 10;
    
    -- إضافة 0.64 TON + 10 عملات للمستخدم
    UPDATE public.telegram_users 
    SET ton_balance = new_ton_balance,
        coins = new_coins,
        last_active = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE '🎉 تم تحديث رصيد المستخدم بنجاح!';
    RAISE NOTICE '👤 المستخدم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '💰 TON: % ← %', old_ton_balance, new_ton_balance;
    RAISE NOTICE '🪙 العملات: % ← %', old_coins, new_coins;
    RAISE NOTICE '✅ المستخدم الآن مؤهل لجميع الميزات';
    RAISE NOTICE '⏰ التاريخ: %', NOW();
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ حدث خطأ: %', SQLERRM;
        ROLLBACK;
END $$;