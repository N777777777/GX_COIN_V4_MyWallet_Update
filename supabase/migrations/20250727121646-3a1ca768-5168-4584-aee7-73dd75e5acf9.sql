-- إزالة الرصيد المضاف بالخطأ من الساعة 5:30 بتوقيت مصر (3:30 UTC) يوم 27/7/2025

-- إنشاء جدول لحفظ نسخة احتياطية من البيانات قبل التعديل
CREATE TABLE IF NOT EXISTS user_balance_backup_20250727_v3 (
    id UUID,
    telegram_id BIGINT,
    first_name TEXT,
    username TEXT,
    coins_before NUMERIC,
    ton_balance_before NUMERIC,
    coins_after NUMERIC,
    ton_balance_after NUMERIC,
    updated_at TIMESTAMP WITH TIME ZONE,
    backup_created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- حفظ نسخة احتياطية من البيانات الحالية للمستخدمين المتأثرين
INSERT INTO user_balance_backup_20250727_v3 (
    id, telegram_id, first_name, username, 
    coins_before, ton_balance_before, updated_at
)
SELECT 
    id, telegram_id, first_name, username,
    COALESCE(coins, 0) as coins_before, 
    COALESCE(ton_balance, 0) as ton_balance_before, 
    updated_at
FROM telegram_users 
WHERE updated_at >= '2025-07-27 03:30:00+00:00'; -- 5:30 بتوقيت مصر = 3:30 UTC

-- إعادة تعيين الرصيد للمستخدمين الجدد (تم إنشاؤهم بعد التوقيت المحدد)
UPDATE telegram_users 
SET 
    coins = 0,
    ton_balance = 0,
    updated_at = NOW()
WHERE updated_at >= '2025-07-27 03:30:00+00:00'
    AND created_at >= '2025-07-27 03:30:00+00:00';

-- للمستخدمين القدامى، تقليل الرصيد بحد أقصى آمن
UPDATE telegram_users 
SET 
    coins = GREATEST(COALESCE(coins, 0) - 50, 0), 
    ton_balance = GREATEST(COALESCE(ton_balance, 0) - 10, 0),
    updated_at = NOW()
WHERE updated_at >= '2025-07-27 03:30:00+00:00'
    AND created_at < '2025-07-27 03:30:00+00:00';

-- تحديث النسخة الاحتياطية بالقيم الجديدة
UPDATE user_balance_backup_20250727_v3 
SET 
    coins_after = tu.coins,
    ton_balance_after = tu.ton_balance
FROM telegram_users tu
WHERE user_balance_backup_20250727_v3.id = tu.id;

-- عرض تقرير بالتغييرات
DO $$
DECLARE
    affected_count INTEGER;
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count 
    FROM telegram_users 
    WHERE updated_at >= '2025-07-27 03:30:00+00:00';
    
    SELECT COUNT(*) INTO backup_count 
    FROM user_balance_backup_20250727_v3;
    
    RAISE NOTICE 'تم تنظيف البيانات المضافة بالخطأ بنجاح';
    RAISE NOTICE 'عدد المستخدمين المتأثرين: %', affected_count;
    RAISE NOTICE 'عدد السجلات في النسخة الاحتياطية: %', backup_count;
END $$;