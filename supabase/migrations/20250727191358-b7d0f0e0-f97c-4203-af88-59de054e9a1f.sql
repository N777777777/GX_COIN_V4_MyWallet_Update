-- إنشاء جدول النسخة الاحتياطية الطارئة
CREATE TABLE IF NOT EXISTS public.current_state_backup_emergency (
  id uuid,
  telegram_id bigint,
  first_name text,
  username text,
  coins_before_restore numeric,
  ton_balance_before_restore numeric,
  backup_timestamp timestamp with time zone DEFAULT now(),
  backup_reason text DEFAULT 'نسخة احتياطية طارئة قبل استعادة أرصدة TON'
);

-- إنشاء نسخة احتياطية من الحالة الحالية
INSERT INTO public.current_state_backup_emergency (
  id, telegram_id, first_name, username, 
  coins_before_restore, ton_balance_before_restore
)
SELECT 
  id, telegram_id, first_name, username,
  coins, ton_balance
FROM public.telegram_users;

-- استعادة أرصدة TON من النسخة الاحتياطية
UPDATE public.telegram_users 
SET ton_balance = COALESCE(recovery_backup.ton_balance_current, 0)
FROM public.recovery_backup_current_state recovery_backup
WHERE telegram_users.telegram_id = recovery_backup.telegram_id;

-- تحديث الأشخاص الذين ليس لديهم بيانات في النسخة الاحتياطية
UPDATE public.telegram_users 
SET ton_balance = 0
WHERE telegram_id NOT IN (
  SELECT telegram_id 
  FROM public.recovery_backup_current_state 
  WHERE telegram_id IS NOT NULL
);