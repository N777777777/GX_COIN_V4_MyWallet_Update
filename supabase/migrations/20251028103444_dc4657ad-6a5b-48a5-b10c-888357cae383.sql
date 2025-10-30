-- Add stars_balance column to telegram_users table
ALTER TABLE telegram_users 
ADD COLUMN IF NOT EXISTS stars_balance NUMERIC DEFAULT 0 NOT NULL;

-- Add index for better performance on stars_balance queries
CREATE INDEX IF NOT EXISTS idx_telegram_users_stars_balance 
ON telegram_users(stars_balance);