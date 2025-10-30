-- اسكربت شامل: تأهيل المستخدم + إضافة 10 نقاط G COIN V3 + إضافة 0.64 TON
DO $$
DECLARE
    target_telegram_id BIGINT := 138370; -- غير هذا الرقم إلى Telegram ID المطلوب
    user_record RECORD;
    coins_reward NUMERIC := 10;
    ton_reward NUMERIC := 0.64;
    old_coins NUMERIC;
    new_coins NUMERIC;
    old_ton_balance NUMERIC;
    new_ton_balance NUMERIC;
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
    
    -- حفظ الأرصدة الحالية
    old_coins := COALESCE(user_record.coins, 0);
    old_ton_balance := COALESCE(user_record.ton_balance, 0);
    new_coins := old_coins + coins_reward;
    new_ton_balance := old_ton_balance + ton_reward;
    
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
        1.0,  -- أي مبلغ TON للتأهيل
        0,    -- لا نضيف عملات إضافية هنا
        'completed',
        true,
        'verified',
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- تحديث أرصدة المستخدم (العملات + TON)
    UPDATE public.telegram_users 
    SET coins = new_coins,
        ton_balance = new_ton_balance,
        last_active = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE '🎉 تم تأهيل المستخدم وإضافة المكافآت بنجاح!';
    RAISE NOTICE '👤 المستخدم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '✅ المستخدم الآن مؤهل للمشاركة في جميع الأنشطة';
    RAISE NOTICE '🪙 G COIN V3: % ← %', old_coins, new_coins;
    RAISE NOTICE '💰 TON Balance: % ← %', old_ton_balance, new_ton_balance;
    RAISE NOTICE '🎁 المكافآت المُضافة: % نقطة + % TON', coins_reward, ton_reward;
    RAISE NOTICE '📅 تاريخ التأهيل: %', NOW();
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ حدث خطأ: %', SQLERRM;
        ROLLBACK;
END $$;