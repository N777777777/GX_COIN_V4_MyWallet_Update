-- إكمال مهمة KUCOIN لمستخدم معين
-- استبدل 'TELEGRAM_ID_HERE' بـ ID التليجرام الفعلي للمستخدم

DO $$
DECLARE
    user_telegram_id BIGINT := 138370; -- ضع هنا ID التليجرام للمستخدم
    user_record RECORD;
    uid_value TEXT := 'AUTO_COMPLETE_' || user_telegram_id; -- UID تلقائي
BEGIN
    -- البحث عن المستخدم
    SELECT * INTO user_record 
    FROM public.telegram_users 
    WHERE telegram_id = user_telegram_id;
    
    -- التحقق من وجود المستخدم
    IF user_record IS NULL THEN
        RAISE NOTICE 'المستخدم غير موجود مع ID: %', user_telegram_id;
        RETURN;
    END IF;
    
    -- التحقق من عدم إكمال المهمة مسبقاً
    IF EXISTS (
        SELECT 1 FROM public.completed_tasks 
        WHERE telegram_user_id = user_record.id 
        AND task_id = '6'
    ) THEN
        RAISE NOTICE 'المستخدم % أكمل مهمة KUCOIN مسبقاً', user_record.first_name;
        RETURN;
    END IF;
    
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
        uid_value,
        'https://t.me/KingsCrypto770/9185',
        NOW()
    );
    
    -- إضافة 10 نقاط للمستخدم
    UPDATE public.telegram_users 
    SET coins = coins + 10,
        last_active = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE 'تم إكمال مهمة KUCOIN للمستخدم % بنجاح! تم إضافة 10 نقاط.', user_record.first_name;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'حدث خطأ: %', SQLERRM;
        ROLLBACK;
END $$;