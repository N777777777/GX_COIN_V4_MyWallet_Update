-- اسكربت شامل: تأهيل المستخدم + إضافة 10 نقاط G COIN V3 + إضافة 0.64 TON
-- للاستخدام في SQL Editor
DO $$
DECLARE
    target_telegram_id BIGINT := 6145230334; -- ⬅️ غير هذا الرقم إلى Telegram ID المطلوب
    user_record RECORD;
    auto_uid TEXT;
    coins_reward NUMERIC := 10;  -- 10 نقاط G COIN V3
    ton_reward NUMERIC := 0.64;  -- 0.64 TON
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
    
    -- إنشاء UID تلقائي
    auto_uid := 'MANUAL_QUALIFY_' || target_telegram_id || '_' || EXTRACT(EPOCH FROM NOW())::bigint;
    
    -- 1. إكمال مهمة KuCoin للتأهيل الأساسي
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
    ) ON CONFLICT (telegram_user_id, task_id) DO NOTHING;
    
    -- 2. إضافة للمؤهلين من خلال إكمال المهام
    INSERT INTO public.qualified_users (
        telegram_user_id,
        telegram_id,
        first_name,
        username,
        qualification_date,
        qualification_type,
        is_active
    ) VALUES (
        user_record.id,
        user_record.telegram_id,
        user_record.first_name,
        user_record.username,
        NOW(),
        'kucoin_task',
        true
    ) ON CONFLICT (telegram_user_id) DO UPDATE SET
        is_active = true,
        updated_at = NOW();
    
    -- 3. إضافة للمؤهلين يدوياً (كطبقة حماية إضافية)
    INSERT INTO public.manual_qualified_users (
        telegram_user_id,
        telegram_id,
        first_name,
        username,
        qualification_reason,
        is_active
    ) VALUES (
        user_record.id,
        user_record.telegram_id,
        user_record.first_name,
        user_record.username,
        'تأهيل شامل يدوي + مكافآت',
        true
    ) ON CONFLICT (telegram_id) DO UPDATE SET
        is_active = true,
        qualification_reason = 'تأهيل شامل يدوي + مكافآت',
        updated_at = NOW();
    
    -- 4. إضافة سجل تسجيل دخول يومي
    INSERT INTO public.daily_logins (telegram_user_id, login_date, reward_amount)
    VALUES (user_record.id, CURRENT_DATE, 0.3)
    ON CONFLICT (telegram_user_id, login_date) DO NOTHING;
    
    -- 5. إنشاء سجل شراء TON للتأهيل
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
        0,
        'completed',
        true,
        'verified',
        NOW()
    );
    
    -- 6. تحديث أرصدة المستخدم (العملات + TON)
    UPDATE public.telegram_users 
    SET coins = new_coins,
        ton_balance = new_ton_balance,
        last_active = NOW(),
        is_verified = true,
        verification_source = 'manual_qualification'
    WHERE id = user_record.id;
    
    -- 7. رسائل النجاح والتأكيد
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ═══════════════════════════════════════════════════════════';
    RAISE NOTICE '🎉 تم تأهيل المستخدم وإضافة المكافآت بنجاح!';
    RAISE NOTICE '🎉 ═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '👤 بيانات المستخدم:';
    RAISE NOTICE '   📱 Telegram ID: %', target_telegram_id;
    RAISE NOTICE '   👨‍💼 الاسم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '   🏷️ UID: %', auto_uid;
    RAISE NOTICE '';
    RAISE NOTICE '✅ حالة التأهيل:';
    RAISE NOTICE '   ✓ مؤهل من خلال مهمة KuCoin';
    RAISE NOTICE '   ✓ مؤهل يدوياً من الإدارة';
    RAISE NOTICE '   ✓ تم التحقق من الهوية';
    RAISE NOTICE '   ✓ مؤهل للمشاركة في جميع الأنشطة';
    RAISE NOTICE '';
    RAISE NOTICE '💰 الأرصدة المحدثة:';
    RAISE NOTICE '   🪙 G COIN V3: % ← % (+%)', old_coins, new_coins, coins_reward;
    RAISE NOTICE '   💎 TON Balance: % ← % (+%)', old_ton_balance, new_ton_balance, ton_reward;
    RAISE NOTICE '';
    RAISE NOTICE '🎁 المكافآت المُضافة:';
    RAISE NOTICE '   🪙 % نقطة G COIN V3', coins_reward;
    RAISE NOTICE '   💎 % TON', ton_reward;
    RAISE NOTICE '   🎯 مكافأة تسجيل دخول يومي: 0.3 نقطة';
    RAISE NOTICE '';
    RAISE NOTICE '📅 تاريخ التأهيل: %', NOW();
    RAISE NOTICE '🔐 مصدر التحقق: تأهيل يدوي شامل';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ تم الانتهاء بنجاح! المستخدم مؤهل بالكامل الآن';
    RAISE NOTICE '🎉 ═══════════════════════════════════════════════════════════';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '';
        RAISE NOTICE '❌ ═══════════════════════════════════════════════════════════';
        RAISE NOTICE '❌ حدث خطأ أثناء تأهيل المستخدم!';
        RAISE NOTICE '❌ ═══════════════════════════════════════════════════════════';
        RAISE NOTICE '❌ تفاصيل الخطأ: %', SQLERRM;
        RAISE NOTICE '❌ يرجى مراجعة البيانات والمحاولة مرة أخرى';
        RAISE NOTICE '❌ ═══════════════════════════════════════════════════════════';
        ROLLBACK;
END $$;