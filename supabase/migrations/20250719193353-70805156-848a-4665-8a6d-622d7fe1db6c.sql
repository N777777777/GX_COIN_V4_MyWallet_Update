-- حذف وإعادة إنشاء مهمة CRYPTO WOLF COMMUNITY بالمكافأة الصحيحة
DELETE FROM public.default_tasks WHERE task_id = 'crypto_wolf_channel_subscription';

INSERT INTO public.default_tasks (
  task_id,
  title,
  description,
  reward_amount,
  task_type,
  requirements,
  is_active
) VALUES (
  'crypto_wolf_channel_subscription',
  'انضم لقناة CRYPTO WOLF COMMUNITY',
  'انضم لقناة CRYPTO WOLF COMMUNITY للحصول على آخر التحديثات والتحليلات في عالم العملات الرقمية',
  0.5,
  'social',
  '{"action": "subscribe", "channel_url": "https://t.me/CRYPTO_WOLF_COMMUNITY", "platform": "telegram", "required": true}'::jsonb,
  true
);