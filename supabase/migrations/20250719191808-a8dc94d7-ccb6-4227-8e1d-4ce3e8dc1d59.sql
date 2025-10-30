-- إضافة المهام القديمة إلى قاعدة البيانات
INSERT INTO public.default_tasks (
  task_id,
  title,
  description,
  reward_amount,
  task_type,
  requirements,
  is_active
) VALUES 
-- مهمة قناة KingsCrypto
('7', 'انضم لقناة التليجرام', 'انضم لقناة KingsCrypto على التليجرام', 1, 'social', '{"action": "subscribe", "platform": "telegram", "channel_url": "https://t.me/KingsCrypto770", "required": true}'::jsonb, true),

-- مهمة قناة CRYPTO PRO
('8', 'انضم لقناة CRYPTO PRO', 'انضم لقناة CRYPTO_PRO_110 على التليجرام', 1, 'social', '{"action": "subscribe", "platform": "telegram", "channel_url": "https://t.me/CRYPTO_PRO_110", "required": true}'::jsonb, true),

-- مهمة KuCoin القديمة
('6', 'KUCOIN', 'شارك في هذا الكامبين لربح 10 G COIN V3', 10, 'platform', '{"action": "participate", "platform": "KuCoin", "campaign_link": "https://t.me/KingsCrypto770/9185", "required": true}'::jsonb, true)

ON CONFLICT (task_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_amount = EXCLUDED.reward_amount,
  task_type = EXCLUDED.task_type,
  requirements = EXCLUDED.requirements,
  is_active = EXCLUDED.is_active;

-- تصحيح مكافأة مهمة CRYPTO WOLF لتصبح 1 عملة
UPDATE public.default_tasks 
SET reward_amount = 1
WHERE task_id = 'crypto_wolf_channel_subscription';