-- Add pending_referrer_id column to telegram_users table
-- This will temporarily store the referrer ID until the user joins the channel

ALTER TABLE telegram_users 
ADD COLUMN IF NOT EXISTS pending_referrer_id bigint;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_telegram_users_pending_referrer 
ON telegram_users(pending_referrer_id) 
WHERE pending_referrer_id IS NOT NULL;

-- Add comment to explain the column purpose
COMMENT ON COLUMN telegram_users.pending_referrer_id IS 'Temporarily stores referrer telegram_id until user completes channel subscription';