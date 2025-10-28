-- تصحيح مكافأة مهمة قناة CRYPTO WOLF COMMUNITY لتصبح 0.5
UPDATE public.default_tasks 
SET reward_amount = 0.5
WHERE task_id = 'crypto_wolf_channel_subscription';