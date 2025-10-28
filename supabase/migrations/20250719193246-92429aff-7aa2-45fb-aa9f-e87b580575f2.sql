-- تحديث صريح لمكافأة مهمة CRYPTO WOLF COMMUNITY
UPDATE public.default_tasks 
SET reward_amount = 0.5::numeric
WHERE task_id = 'crypto_wolf_channel_subscription';