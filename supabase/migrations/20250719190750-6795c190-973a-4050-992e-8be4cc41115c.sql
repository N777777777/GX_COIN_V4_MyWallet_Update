-- إضافة مهمة اشتراك في القناة
INSERT INTO public.default_tasks (
  task_id,
  title,
  description,
  reward_amount,
  task_type,
  requirements,
  is_active
) VALUES (
  'telegram_channel_subscription',
  'اشترك في القناة',
  'اشترك في القناة الرسمية للحصول على آخر التحديثات والعروض الحصرية',
  0.5,
  'social',
  '{"action": "subscribe", "platform": "telegram", "required": true}'::jsonb,
  true
) ON CONFLICT (task_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_amount = EXCLUDED.reward_amount,
  task_type = EXCLUDED.task_type,
  requirements = EXCLUDED.requirements,
  is_active = EXCLUDED.is_active;