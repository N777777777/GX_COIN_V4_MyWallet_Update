-- إضافة عمود status إلى جدول telegram_users
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned', 'suspended'));

-- تحديث البيانات الموجودة بناءً على is_blocked
UPDATE public.telegram_users 
SET status = CASE 
  WHEN is_blocked = true THEN 'banned'
  ELSE 'active'
END
WHERE status IS NULL OR status = 'active';

-- إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_telegram_users_status ON public.telegram_users(status);

-- تحديث RLS policies للسماح بقراءة عمود status
COMMENT ON COLUMN public.telegram_users.status IS 'User account status: active, banned, or suspended';