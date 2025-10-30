-- ===================================================================
-- سكربت تأهيل مستخدم يدوياً عبر Telegram ID
-- للاستخدام في Supabase SQL Editor
-- ===================================================================

DO $$
DECLARE
    target_telegram_id BIGINT := 123456789; -- ⬅️ غير هذا الرقم إلى Telegram ID المطلوب
    user_record RECORD;
    qualification_result JSON;
    already_qualified BOOLEAN := FALSE;
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
    
    -- التحقق من التأهيل المسبق
    SELECT EXISTS (
        SELECT 1 FROM public.manual_qualified_users 
        WHERE telegram_id = target_telegram_id AND is_active = true
    ) INTO already_qualified;
    
    IF already_qualified THEN
        RAISE NOTICE '⚠️ المستخدم مؤهل مسبقاً في جدول manual_qualified_users';
    ELSE
        -- استخدام الدالة الموجودة لإضافة المستخدم للمؤهلين يدوياً
        SELECT public.add_manual_qualified_user(
            target_telegram_id, 
            'تأهيل يدوي من الإدارة - سكربت SQL'
        ) INTO qualification_result;
        
        RAISE NOTICE 'نتيجة التأهيل اليدوي: %', qualification_result;
    END IF;
    
    -- إضافة سجل في daily_logins للتأهيل (مرة واحدة فقط)
    INSERT INTO public.daily_logins (telegram_user_id, login_date, reward_amount)
    VALUES (user_record.id, CURRENT_DATE, 0.3)
    ON CONFLICT (telegram_user_id, login_date) DO NOTHING;
    
    RAISE NOTICE '✅ تم إضافة سجل تسجيل الدخول اليومي';
    
    -- إنشاء سجل شراء TON للتأهيل (إذا لم يكن موجوداً)
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
        1.0,  -- مبلغ TON للتأهيل
        0,    -- لا نضيف عملات إضافية
        'completed',
        true,
        'verified',
        NOW()
    ) 
    ON CONFLICT (telegram_user_id, ton_amount, status) DO NOTHING;
    
    RAISE NOTICE '✅ تم إنشاء سجل شراء TON للتأهيل';
    
    -- إضافة المستخدم لجدول qualified_users أيضاً
    INSERT INTO public.qualified_users (
        telegram_user_id,
        telegram_id,
        first_name,
        username,
        qualification_type,
        qualification_date
    ) VALUES (
        user_record.id,
        user_record.telegram_id,
        user_record.first_name,
        user_record.username,
        'manual',
        NOW()
    )
    ON CONFLICT (telegram_user_id) DO UPDATE SET
        is_active = true,
        qualification_type = 'manual',
        updated_at = NOW();
    
    RAISE NOTICE '✅ تم إضافة المستخدم لجدول qualified_users';
    
    -- تحديث حالة التحقق للمستخدم
    UPDATE public.telegram_users 
    SET 
        is_verified = true,
        verification_source = 'manual_qualification',
        last_verification_at = NOW()
    WHERE id = user_record.id;
    
    RAISE NOTICE '✅ تم تحديث حالة التحقق للمستخدم';
    
    -- رسائل النجاح النهائية
    RAISE NOTICE '';
    RAISE NOTICE '🎉 تم تأهيل المستخدم بنجاح!';
    RAISE NOTICE '=================================';
    RAISE NOTICE '👤 المستخدم: %', COALESCE(user_record.first_name, user_record.username, 'غير محدد');
    RAISE NOTICE '🆔 Telegram ID: %', target_telegram_id;
    RAISE NOTICE '✅ المستخدم الآن مؤهل للمشاركة في جميع الأنشطة';
    RAISE NOTICE '📅 تاريخ التأهيل: %', NOW();
    RAISE NOTICE '🔐 حالة التحقق: مؤهل يدوياً';
    RAISE NOTICE '=================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ حدث خطأ أثناء التأهيل: %', SQLERRM;
        RAISE NOTICE 'تفاصيل الخطأ: %', SQLSTATE;
        ROLLBACK;
END $$;

-- ===================================================================
-- تعليمات الاستخدام:
-- 1. غير قيمة target_telegram_id في بداية السكربت
-- 2. قم بتشغيل السكربت في Supabase SQL Editor
-- 3. راقب الرسائل في النتائج للتأكد من نجاح العملية
-- ===================================================================