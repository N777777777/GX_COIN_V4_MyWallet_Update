-- إكمال مهمة KUCOIN مع إضافة 0.64 TON (النسخة المُصححة)
-- استبدل 138370 بـ ID التليجرام المطلوب

DO $$
DECLARE
    target_telegram_id BIGINT := 138370; -- ⬅️ ضع هنا ID التليجرام
    user_record RECORD;
    auto_uid TEXT;
    old_ton_balance NUMERIC;
    new_ton_balance NUMERIC;
    ton_reward NUMERIC := 0.64; -- مكافأة TON بدلاً من النقاط
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
    
    -- حفظ رصيد TON الحالي
    old_ton_balance := COALESCE(user_record.ton_balance, 0);
    new_ton_balance := old_ton_balance + ton_reward;
    
    -- إدراج المهمة في completed_tasks مع المكافأة الصحيحة
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
        ton_reward, -- المكافأة 0.64 TON
        auto_uid,
        'https://t.me/KingsCrypto770/9185',
        NOW()
    );
    
    -- إضافة 0.64 TON للمستخدم (بدلاً من النقاط)
    UPDATE public.telegram_users 
    SET ton_balance = new_ton_balance,
        last_active = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE '🎉 تم إكمال مهمة KUCOIN بنجاح!';
    RAISE NOTICE '👤 المستخدم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '🏷️ UID: %', auto_uid;
    RAISE NOTICE '💰 TON Balance: % ← %', old_ton_balance, new_ton_balance;
    RAISE NOTICE '🎁 المكافأة: % TON', ton_reward;
    RAISE NOTICE '⏰ تاريخ الإكمال: %', NOW();
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ حدث خطأ: %', SQLERRM;
        ROLLBACK;
END $$;