-- تحديث رابط مهمة KuCoin الأول
UPDATE default_tasks 
SET requirements = jsonb_set(requirements, '{campaign_link}', '"https://t.me/KingsCrypto770/9585"')
WHERE task_id = '6' AND title = 'KUCOIN';

-- إضافة زر ثاني لمهمة KuCoin
UPDATE default_tasks 
SET requirements = jsonb_set(
  requirements, 
  '{campaign_link_2}', 
  '"https://t.me/G_COIN_V3/577"'
)
WHERE task_id = '6' AND title = 'KUCOIN';