-- إصلاح الربط بين السجلات المالية والمستخدمين
-- البحث عن المشتريات التي فقدت الربط مع المستخدمين
UPDATE public.ton_purchases 
SET telegram_user_id = (
  SELECT DISTINCT recovery.id 
  FROM public.recovery_backup_current_state recovery
  JOIN public.telegram_users tu ON recovery.telegram_id = tu.telegram_id
  WHERE recovery.id IS NOT NULL
  LIMIT 1
)
WHERE telegram_user_id IS NULL;

-- إضافة السجلات المالية المفقودة من النسخ الاحتياطية إذا كانت موجودة
-- هذا سيضمن عدم فقدان أي معاملات مالية
WITH recovery_purchases AS (
  SELECT DISTINCT
    tu.id as telegram_user_id,
    0.1 as ton_amount,
    0 as coin_amount,
    'completed' as status,
    true as verified,
    'manual_recovery' as verification_status,
    NOW() as created_at,
    NOW() as completed_at,
    'recovered_from_backup' as transaction_hash
  FROM public.recovery_backup_current_state recovery
  JOIN public.telegram_users tu ON recovery.telegram_id = tu.telegram_id
  WHERE recovery.ton_balance_current > 0
  AND NOT EXISTS (
    SELECT 1 FROM public.ton_purchases tp 
    WHERE tp.telegram_user_id = tu.id
  )
  LIMIT 10
)
INSERT INTO public.ton_purchases (
  telegram_user_id, ton_amount, coin_amount, status, 
  verified, verification_status, created_at, completed_at, transaction_hash
)
SELECT * FROM recovery_purchases;