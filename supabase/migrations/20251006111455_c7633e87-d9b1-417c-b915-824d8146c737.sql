-- إضافة حقل ton_wallet_address لجدول telegram_users
ALTER TABLE telegram_users 
ADD COLUMN IF NOT EXISTS ton_wallet_address TEXT;

-- إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_ton_wallet_address 
ON telegram_users(ton_wallet_address) 
WHERE ton_wallet_address IS NOT NULL;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN telegram_users.ton_wallet_address IS 'عنوان محفظة TON المربوطة بالمستخدم';