-- إضافة 5 عملات G COIN V4 لجميع المستخدمين (استخدام الاسم المشفر للعمود)
UPDATE public.telegram_users 
SET bal_g4v7y = COALESCE(bal_g4v7y, 0) + 5,
    updated_at = now()
WHERE status != 'banned' OR status IS NULL;

-- تسجيل العملية في سجل التدقيق
INSERT INTO public.balance_audit_log (
  telegram_user_id,
  telegram_id,
  balance_type,
  operation_type,
  old_balance,
  new_balance,
  amount_changed,
  source,
  additional_data
)
SELECT 
  id,
  telegram_id,
  'bal_g4v7y',
  'admin_bonus',
  COALESCE(bal_g4v7y, 0) - 5,
  COALESCE(bal_g4v7y, 0),
  5,
  'mass_distribution',
  jsonb_build_object('reason', 'Admin bonus to all active users', 'date', now())
FROM public.telegram_users
WHERE status != 'banned' OR status IS NULL;