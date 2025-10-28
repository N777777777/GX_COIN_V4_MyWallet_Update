-- سكربت شامل: إضافة النقاط والتون وجعل المستخدم مؤهل
DO $$
DECLARE
    target_telegram_id BIGINT := 138370;
    user_record RECORD;
    coins_reward NUMERIC := 10;
    ton_reward NUMERIC := 0.64;
    old_coins NUMERIC;
    new_coins NUMERIC;
    old_ton NUMERIC;
    new_ton NUMERIC;
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
    
    RAISE NOTICE '✅ تم العثور على المستخدم: %', 
        COALESCE(user_record.first_name, user_record.username, target_telegram_id::text);
    
    -- التحقق من أن المهمة مكتملة
    IF NOT EXISTS (
        SELECT 1 FROM public.completed_tasks 
        WHERE telegram_user_id = user_record.id 
        AND task_id = '6'
    ) THEN
        RAISE NOTICE '⚠️ المستخدم لم يكمل مهمة KUCOIN بعد';
        RETURN;
    END IF;
    
    -- حفظ الأرصدة الحالية
    old_coins := COALESCE(user_record.coins, 0);
    new_coins := old_coins + coins_reward;
    old_ton := COALESCE(user_record.ton_balance, 0);
    new_ton := old_ton + ton_reward;
    
    -- تحديث المستخدم: إضافة النقاط والتون وجعله مؤهل
    UPDATE public.telegram_users 
    SET coins = new_coins,
        ton_balance = new_ton,
        last_active = NOW()
    WHERE id = user_record.id;
    
    -- إضافة سجل في جدول daily_logins إذا لم يسجل دخول اليوم (كنوع من التأهيل)
    INSERT INTO public.daily_logins (telegram_user_id, login_date, reward_amount)
    VALUES (user_record.id, CURRENT_DATE, 0)
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
        ton_reward,
        coins_reward,
        'completed',
        true,
        'verified',
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '🎉 تم تحديث المستخدم بنجاح!';
    RAISE NOTICE '👤 المستخدم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '🪙 G COIN V3: % ← %', old_coins, new_coins;
    RAISE NOTICE '💰 TON Balance: % ← %', old_ton, new_ton;
    RAISE NOTICE '🎁 المكافآت: % نقطة G COIN + % TON', coins_reward, ton_reward;
    RAISE NOTICE '✅ تم تأهيل المستخدم للمشاركة في الأنشطة';
    RAISE NOTICE '⏰ التاريخ: %', NOW();
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ حدث خطأ: %', SQLERRM;
        ROLLBACK;
END $$;