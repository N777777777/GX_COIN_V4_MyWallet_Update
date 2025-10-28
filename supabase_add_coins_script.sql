-- ===================================================================
-- سكريپت تزويد رصيد العملات للمستخدمين عبر ID التليجرام
-- للاستخدام في Supabase SQL Editor
-- ===================================================================

-- الطريقة الأولى: تزويد مستخدم واحد
-- استبدل القيم التالية:
-- 123456789: ضع ID التليجرام للمستخدم
-- 100: المبلغ المراد إضافته

UPDATE public.telegram_users 
SET 
  coins = coins + 100,  -- ⬅️ غير هذا الرقم للمبلغ المطلوب
  last_active = NOW()
WHERE telegram_id = 123456789; -- ⬅️ ضع هنا ID التليجرام

-- التحقق من النتيجة
SELECT 
  telegram_id,
  first_name,
  username,
  coins,
  last_active
FROM public.telegram_users 
WHERE telegram_id = 123456789; -- ⬅️ نفس ID التليجرام

-- ===================================================================

-- الطريقة الثانية: تزويد عدة مستخدمين في مرة واحدة
-- مع جدول مؤقت للقيم

WITH user_bonuses AS (
  VALUES 
    (123456789, 50),   -- ID التليجرام، مبلغ العملات
    (987654321, 100),  -- ID التليجرام، مبلغ العملات
    (555666777, 25)    -- أضف المزيد حسب الحاجة
)
UPDATE public.telegram_users 
SET 
  coins = coins + user_bonuses.column2,
  last_active = NOW()
FROM user_bonuses
WHERE telegram_users.telegram_id = user_bonuses.column1;

-- التحقق من النتائج للعدة مستخدمين
SELECT 
  telegram_id,
  first_name,
  username,
  coins,
  last_active
FROM public.telegram_users 
WHERE telegram_id IN (123456789, 987654321, 555666777);

-- ===================================================================

-- الطريقة الثالثة: تزويد جميع المستخدمين بنفس المبلغ
-- حذار: هذا سيؤثر على جميع المستخدمين!

-- UPDATE public.telegram_users 
-- SET 
--   coins = coins + 10,  -- مبلغ ثابت لجميع المستخدمين
--   last_active = NOW();

-- ===================================================================

-- الطريقة الرابعة: تزويد المستخدمين النشطين فقط (دخلوا خلال آخر 7 أيام)

-- UPDATE public.telegram_users 
-- SET 
--   coins = coins + 20,
--   last_active = NOW()
-- WHERE last_active >= NOW() - INTERVAL '7 days';

-- ===================================================================

-- طريقة آمنة للتجربة: التحقق أولاً قبل التحديث
-- (قم بتشغيل هذا أولاً للتأكد من المستخدم)

SELECT 
  telegram_id,
  first_name,
  username,
  coins AS current_coins,
  coins + 100 AS new_coins_after_bonus, -- المبلغ الجديد بعد الإضافة
  last_active
FROM public.telegram_users 
WHERE telegram_id = 123456789; -- ⬅️ ضع ID التليجرام هنا

-- إذا كان كل شيء صحيحاً، قم بتشغيل UPDATE أعلاه