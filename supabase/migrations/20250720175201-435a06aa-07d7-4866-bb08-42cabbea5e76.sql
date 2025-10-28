-- إضافة 10 نقاط G COIN V3 للمستخدم رقم 138370 الذي أكمل مهمة KUCOIN
DO $$
DECLARE
    target_telegram_id BIGINT := 138370;
    user_record RECORD;
    coins_reward NUMERIC := 10;
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
    
    -- التحقق من أن المهمة مكتملة
    IF NOT EXISTS (
        SELECT 1 FROM public.completed_tasks 
        WHERE telegram_user_id = user_record.id 
        AND task_id = '6'
    ) THEN
        RAISE NOTICE '⚠️ المستخدم لم يكمل مهمة KUCOIN بعد';
        RETURN;
    END IF;
    
    -- حفظ النقاط الحالية
    old_coins := COALESCE(user_record.coins, 0);
    new_coins := old_coins + coins_reward;
    
    -- إضافة 10 نقاط G COIN V3 للمستخدم
    UPDATE public.telegram_users 
    SET coins = new_coins,
        last_active = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE '🎉 تم إضافة نقاط G COIN V3 بنجاح!';
    RAISE NOTICE '👤 المستخدم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '🪙 G COIN V3: % ← %', old_coins, new_coins;
    RAISE NOTICE '🎁 النقاط المُضافة: % نقطة', coins_reward;
    
END $$;