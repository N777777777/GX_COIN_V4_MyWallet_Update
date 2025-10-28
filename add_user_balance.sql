-- سكريبت لزيادة رصيد المستخدم عبر ID التليجرام
-- استبدل القيم التالية:
-- TELEGRAM_ID_HERE: ضع ID التليجرام للمستخدم
-- COINS_AMOUNT: المبلغ المراد إضافته للعملات
-- TON_AMOUNT: المبلغ المراد إضافته لرصيد TON

-- مثال: إضافة 100 عملة و 5 TON للمستخدم صاحب ID 123456789
-- UPDATE public.telegram_users 
-- SET 
--   coins = coins + 100,
--   ton_balance = ton_balance + 5,
--   last_active = NOW()
-- WHERE telegram_id = 123456789;

-- النسخة العامة (يمكن تخصيصها)
UPDATE public.telegram_users 
SET 
  coins = coins + 0,           -- ⬅️ ضع هنا مبلغ العملات المراد إضافته
  ton_balance = ton_balance + 0, -- ⬅️ ضع هنا مبلغ TON المراد إضافته
  last_active = NOW()
WHERE telegram_id = 0;         -- ⬅️ ضع هنا ID التليجرام

-- التحقق من النتيجة
SELECT 
  telegram_id,
  first_name,
  coins,
  ton_balance,
  last_active
FROM public.telegram_users 
WHERE telegram_id = 0;         -- ⬅️ ضع هنا نفس ID التليجرام للتحقق

-- مثال عملي:
-- UPDATE public.telegram_users 
-- SET 
--   coins = coins + 50,
--   ton_balance = ton_balance + 2,
--   last_active = NOW()
-- WHERE telegram_id = 138370;

-- SELECT telegram_id, first_name, coins, ton_balance FROM public.telegram_users WHERE telegram_id = 138370;