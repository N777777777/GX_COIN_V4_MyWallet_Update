-- إكمال مهمة KUCOIN - نسخة سريعة
-- استبدل 138370 بـ ID التليجرام المطلوب

WITH target_user AS (
  SELECT id, telegram_id, first_name, username, coins 
  FROM public.telegram_users 
  WHERE telegram_id = 138370 -- ⬅️ ضع هنا ID التليجرام
),
task_insert AS (
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
    'AUTO_' || telegram_id || '_' || EXTRACT(EPOCH FROM NOW())::bigint,
    'https://t.me/KingsCrypto770/9185',
    NOW()
  FROM target_user
  WHERE NOT EXISTS (
    SELECT 1 FROM public.completed_tasks 
    WHERE telegram_user_id = target_user.id AND task_id = '6'
  )
  RETURNING telegram_user_id, uid
),
coins_update AS (
  UPDATE public.telegram_users 
  SET coins = coins + 10, last_active = NOW()
  WHERE id IN (SELECT telegram_user_id FROM task_insert)
  RETURNING id, coins
)
SELECT 
  u.telegram_id,
  COALESCE(u.first_name, u.username, 'غير محدد') as user_name,
  ti.uid,
  cu.coins as new_coins_total,
  'مهمة KUCOIN مكتملة بنجاح! ✅' as status
FROM target_user u
JOIN task_insert ti ON u.id = ti.telegram_user_id
JOIN coins_update cu ON u.id = cu.id;