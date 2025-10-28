-- تصحيح مكافأة مهمة CRYPTO WOLF COMMUNITY لتصبح 0.5 عملة
UPDATE public.default_tasks 
SET reward_amount = 0.5, updated_at = NOW()
WHERE task_id = 'crypto_wolf_channel_subscription';

-- التحقق من التحديث
SELECT task_id, title, reward_amount FROM public.default_tasks WHERE task_id = 'crypto_wolf_channel_subscription';