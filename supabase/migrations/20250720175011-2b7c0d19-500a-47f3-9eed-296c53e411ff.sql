-- إضافة 0.64 TON للمستخدم رقم 138370 الذي أكمل مهمة KUCOIN
DO $$
DECLARE
    target_telegram_id BIGINT := 138370;
    user_record RECORD;
    ton_reward NUMERIC := 0.64;
    old_ton_balance NUMERIC;
    new_ton_balance NUMERIC;
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
    
    -- حفظ الرصيد الحالي
    old_ton_balance := COALESCE(user_record.ton_balance, 0);
    new_ton_balance := old_ton_balance + ton_reward;
    
    -- إضافة 0.64 TON للمستخدم
    UPDATE public.telegram_users 
    SET ton_balance = new_ton_balance,
        last_active = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE '🎉 تم إضافة مكافأة TON بنجاح!';
    RAISE NOTICE '👤 المستخدم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '💰 TON Balance: % ← %', old_ton_balance, new_ton_balance;
    RAISE NOTICE '🎁 المكافأة المُضافة: % TON', ton_reward;
    
END $$;