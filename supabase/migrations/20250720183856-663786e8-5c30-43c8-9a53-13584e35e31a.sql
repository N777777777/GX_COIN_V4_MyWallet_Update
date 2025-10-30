-- سكربت لجعل مستخدم مؤهل عبر Telegram ID
DO $$
DECLARE
    target_telegram_id BIGINT := 138370; -- غير هذا الرقم إلى Telegram ID المطلوب
    user_record RECORD;
BEGIN
    -- البحث عن المستخدم
    SELECT * INTO user_record 
    FROM public.telegram_users 
    WHERE telegram_id = target_telegram_id;
    
    -- التحقق من وجود المستخدم
    IF user_record IS NULL THEN
        RAISE NOTICE '❌ المستخدم غير موجود مع Telegram ID: %', target_telegram_id;
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ تم العثور على المستخدم: %', 
        COALESCE(user_record.first_name, user_record.username, target_telegram_id::text);
    
    -- إضافة سجل في daily_logins للتأهيل
    INSERT INTO public.daily_logins (telegram_user_id, login_date, reward_amount)
    VALUES (user_record.id, CURRENT_DATE, 0.3)
    ON CONFLICT (telegram_user_id, login_date) DO NOTHING;
    
    -- إنشاء سجل شراء TON للتأهيل
    INSERT INTO public.ton_purchases (
        telegram_user_id,
        ton_amount,
        coin_amount,
        status,
        verified,
        verification_status,
        completed_at
    ) VALUES (
        user_record.id,
        1.0,  -- أي مبلغ TON
        0,    -- لا نضيف عملات إضافية
        'completed',
        true,
        'verified',
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '🎉 تم تأهيل المستخدم بنجاح!';
    RAISE NOTICE '👤 المستخدم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '✅ المستخدم الآن مؤهل للمشاركة في جميع الأنشطة';
    RAISE NOTICE '📅 تاريخ التأهيل: %', NOW();
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ حدث خطأ: %', SQLERRM;
        ROLLBACK;
END $$;