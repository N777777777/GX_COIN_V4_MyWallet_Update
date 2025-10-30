-- إكمال مهمة KUCOIN لمستخدم معين
-- استبدل 138370 بـ ID التليجرام المطلوب

DO $$
DECLARE
    target_telegram_id BIGINT := 138370; -- ⬅️ ضع هنا ID التليجرام
    user_record RECORD;
    auto_uid TEXT;
    old_coins NUMERIC;
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
    
    -- التحقق من عدم إكمال المهمة مسبقاً
    IF EXISTS (
        SELECT 1 FROM public.completed_tasks 
        WHERE telegram_user_id = user_record.id 
        AND task_id = '6'
    ) THEN
        RAISE NOTICE '⚠️ المستخدم أكمل مهمة KUCOIN مسبقاً';
        RETURN;
    END IF;
    
    -- إنشاء UID تلقائي
    auto_uid := 'AUTO_' || target_telegram_id || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
    
    -- حفظ النقاط الحالية
    old_coins := COALESCE(user_record.coins, 0);
    new_coins := old_coins + 10;
    
    -- إدراج المهمة في completed_tasks
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
    
    -- إضافة 10 نقاط للمستخدم
    UPDATE public.telegram_users 
    SET coins = new_coins,
        last_active = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE '🎉 تم إكمال مهمة KUCOIN بنجاح!';
    RAISE NOTICE '👤 المستخدم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '🏷️ UID: %', auto_uid;
    RAISE NOTICE '💰 النقاط: % ← %', old_coins, new_coins;
    RAISE NOTICE '⏰ تاريخ الإكمال: %', NOW();
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ حدث خطأ: %', SQLERRM;
        ROLLBACK;
END $$;