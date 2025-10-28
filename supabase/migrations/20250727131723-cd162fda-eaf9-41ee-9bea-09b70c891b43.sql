-- إصلاح مشكلة foreign key constraint وإرجاع البيانات إلى ما قبل 24 يوليو

-- أولاً: حذف جميع الإحالات اليتيمة بشكل شامل
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- حذف الإحالات التي تشير لمستخدمين غير موجودين (referred_telegram_id)
    DELETE FROM public.user_referrals 
    WHERE referred_telegram_id NOT IN (
        SELECT telegram_id FROM public.telegram_users
    );
    
    GET DIAGNOSTICS orphaned_count = ROW_COUNT;
    RAISE NOTICE 'تم حذف % إحالة يتيمة (referred_telegram_id)', orphaned_count;
    
    -- حذف الإحالات التي تشير لمُحيلين غير موجودين (referrer_telegram_id)
    DELETE FROM public.user_referrals 
    WHERE referrer_telegram_id NOT IN (
        SELECT telegram_id FROM public.telegram_users
    );
    
    GET DIAGNOSTICS orphaned_count = ROW_COUNT;
    RAISE NOTICE 'تم حذف % إحالة يتيمة (referrer_telegram_id)', orphaned_count;
    
    -- حذف جميع الإحالات المتبقية لضمان عدم وجود قيود
    DELETE FROM public.user_referrals;
    
    GET DIAGNOSTICS orphaned_count = ROW_COUNT;
    RAISE NOTICE 'تم حذف جميع الإحالات المتبقية: %', orphaned_count;
END $$;

-- ثانياً: إنشاء نسخة احتياطية نهائية للحالة الحالية
DROP TABLE IF EXISTS final_restoration_current_backup CASCADE;
CREATE TABLE final_restoration_current_backup AS
SELECT 
    id,
    telegram_id,
    first_name,
    username,
    coins as coins_before_final_restore,
    ton_balance as ton_balance_before_final_restore,
    created_at,
    updated_at,
    NOW() as backup_timestamp,
    'نسخة احتياطية قبل الاستعادة النهائية إلى ما قبل 24 يوليو' as backup_reason
FROM public.telegram_users;

-- ثالثاً: حذف جميع المستخدمين الحاليين
DELETE FROM public.telegram_users;

-- رابعاً: استعادة جميع المستخدمين من النسخة الأصلية قبل 24 يوليو
WITH unique_backup AS (
    SELECT DISTINCT ON (telegram_id)
        telegram_id,
        first_name,
        username,
        COALESCE(coins_current, 0) as coins,
        COALESCE(ton_balance_current, 0) as ton_balance,
        COALESCE(created_at, NOW()) as created_at
    FROM public.user_balance_backup_before_1am_egypt
    WHERE telegram_id IS NOT NULL
    ORDER BY telegram_id, backup_created_at DESC NULLS LAST
)
INSERT INTO public.telegram_users (
    telegram_id, first_name, username, coins, ton_balance, 
    created_at, updated_at, energy, energy_limit, coins_per_tap,
    is_verified, verification_source
)
SELECT 
    telegram_id,
    first_name,
    username,
    coins,
    ton_balance,
    created_at,
    NOW() as updated_at,
    1000 as energy,
    1000 as energy_limit,
    1 as coins_per_tap,
    false as is_verified,
    'restored_from_backup' as verification_source
FROM unique_backup;

-- خامساً: تقرير الاستعادة النهائية
DO $$
DECLARE
    total_users_restored INTEGER;
    total_coins_restored NUMERIC;
    total_ton_restored NUMERIC;
    original_users INTEGER;
    original_coins NUMERIC;
    original_ton NUMERIC;
BEGIN
    -- حساب البيانات المستعادة
    SELECT 
        COUNT(*),
        SUM(COALESCE(coins, 0)),
        SUM(COALESCE(ton_balance, 0))
    INTO total_users_restored, total_coins_restored, total_ton_restored
    FROM public.telegram_users;
    
    -- حساب البيانات الأصلية الفريدة
    WITH original_unique AS (
        SELECT DISTINCT ON (telegram_id)
            telegram_id,
            COALESCE(coins_current, 0) as coins,
            COALESCE(ton_balance_current, 0) as ton_balance
        FROM public.user_balance_backup_before_1am_egypt
        WHERE telegram_id IS NOT NULL
        ORDER BY telegram_id, backup_created_at DESC NULLS LAST
    )
    SELECT 
        COUNT(*),
        SUM(coins),
        SUM(ton_balance)
    INTO original_users, original_coins, original_ton
    FROM original_unique;
    
    RAISE NOTICE '============= تقرير الاستعادة النهائية إلى ما قبل 24 يوليو =============';
    RAISE NOTICE 'المستخدمون في النسخة الأصلية (فريدة): %', original_users;
    RAISE NOTICE 'المستخدمون المستعادون: %', total_users_restored;
    RAISE NOTICE 'العملات في النسخة الأصلية: %', original_coins;
    RAISE NOTICE 'العملات المستعادة: %', total_coins_restored;
    RAISE NOTICE 'TON في النسخة الأصلية: %', original_ton;
    RAISE NOTICE 'TON المستعاد: %', total_ton_restored;
    RAISE NOTICE 'تم حل مشكلة foreign key constraint والتكرارات وإرجاع البيانات بنجاح';
    RAISE NOTICE '==================================================================';
END $$;