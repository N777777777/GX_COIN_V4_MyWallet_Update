-- إضافة مهمة اشتراك في قناة CRYPTO WOLF COMMUNITY
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
  '{"action": "subscribe", "platform": "telegram", "channel_url": "https://t.me/CRYPTO_WOLF_COMMUNITY", "required": true}'::jsonb,
  true
) ON CONFLICT (task_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_amount = EXCLUDED.reward_amount,
  task_type = EXCLUDED.task_type,
  requirements = EXCLUDED.requirements,
  is_active = EXCLUDED.is_active;