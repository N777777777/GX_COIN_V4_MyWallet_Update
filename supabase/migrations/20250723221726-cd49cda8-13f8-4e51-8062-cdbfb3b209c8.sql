-- حذف جميع المهام الاجتماعية ماعدا مهمة KingsCrypto770
DELETE FROM public.default_tasks 
WHERE task_type = 'social' 
AND task_id NOT IN ('7'); -- الاحتفاظ بمهمة KingsCrypto770 فقط

-- حذف المهام الاجتماعية الأخرى بالـ task_id المحددة
DELETE FROM public.default_tasks 
WHERE task_id IN (
  '8', -- قناة CRYPTO_PRO_110
  'crypto_wolf_channel_subscription', -- قناة CRYPTO WOLF
  'telegram_channel_subscription' -- القناة العامة
);