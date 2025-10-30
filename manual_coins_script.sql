-- تعيين رصيد محدد للعملات
UPDATE public.telegram_users 
SET coins = 10.0 
WHERE telegram_id = 6195301672;

-- التحقق من النتيجة
SELECT telegram_id, first_name, coins FROM public.telegram_users 
WHERE telegram_id = 6195301672;