-- كود سريع لإكمال مهمة KUCOIN - استبدل TELEGRAM_ID بالمعرف الفعلي

-- 1. أولاً احصل على معرف المستخدم الداخلي
WITH user_data AS (
  SELECT id, telegram_id, first_name, coins 
  FROM public.telegram_users 
  WHERE telegram_id = 138370 -- ضع هنا ID التليجرام
)

-- 2. إدراج المهمة (سيتم تجاهلها إذا كانت موجودة مسبقاً)
INSERT INTO public.completed_tasks (
    telegram_user_id,
    task_id,
    task_title,
    task_type,
    reward_amount,
    uid,
    campaign_link,
    completed_at
)
SELECT 
    id,
    '6',
    'KUCOIN',
    'platform',
    10,
    'AUTO_COMPLETE_' || telegram_id,
    'https://t.me/KingsCrypto770/9185',
    NOW()
FROM user_data
ON CONFLICT (telegram_user_id, task_id) DO NOTHING;

-- 3. إضافة النقاط (فقط إذا لم تكن المهمة مكتملة مسبقاً)
UPDATE public.telegram_users 
SET coins = coins + 10,
    last_active = NOW()
WHERE telegram_id = 138370 -- ضع هنا ID التليجرام
AND NOT EXISTS (
    SELECT 1 FROM public.completed_tasks 
    WHERE telegram_user_id = (
        SELECT id FROM public.telegram_users WHERE telegram_id = 138370
    ) 
    AND task_id = '6'
    AND created_at < NOW() - INTERVAL '1 minute' -- تجنب إضافة النقاط للمهمة الجديدة فوراً
);

-- 4. عرض النتيجة
SELECT 
    u.telegram_id,
    u.first_name,
    u.coins,
    CASE 
        WHEN ct.id IS NOT NULL THEN 'مكتملة'
        ELSE 'غير مكتملة'
    END as kucoin_status
FROM public.telegram_users u
LEFT JOIN public.completed_tasks ct ON u.id = ct.telegram_user_id AND ct.task_id = '6'
WHERE u.telegram_id = 138370; -- ضع هنا ID التليجرام