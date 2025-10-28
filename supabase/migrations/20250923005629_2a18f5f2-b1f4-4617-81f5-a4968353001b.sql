-- تصحيح رصيد عملات ألفا للمستخدم الحالي
UPDATE public.telegram_users 
SET coins = 7 
WHERE telegram_id = 6854864464;