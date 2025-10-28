-- Obfuscate sensitive column names for additional security
-- This migration renames columns to non-descriptive names

-- Rename balance columns in telegram_users table
ALTER TABLE public.telegram_users 
  RENAME COLUMN pepe_balance TO bal_x7k9m;

ALTER TABLE public.telegram_users 
  RENAME COLUMN pepe_advertising_balance TO bal_j3n8q;

ALTER TABLE public.telegram_users 
  RENAME COLUMN pepe_withdrawable_balance TO bal_w5r2t;

ALTER TABLE public.telegram_users 
  RENAME COLUMN gcoin_v4_balance TO bal_g4v7y;

ALTER TABLE public.telegram_users 
  RENAME COLUMN alpha_coins TO bal_a6c3z;

ALTER TABLE public.telegram_users 
  RENAME COLUMN ton_wallet_address TO addr_t9w2x;

-- Add comments for internal reference (not visible to attackers)
COMMENT ON COLUMN public.telegram_users.bal_x7k9m IS 'Obfuscated: pepe_balance';
COMMENT ON COLUMN public.telegram_users.bal_j3n8q IS 'Obfuscated: pepe_advertising_balance';
COMMENT ON COLUMN public.telegram_users.bal_w5r2t IS 'Obfuscated: pepe_withdrawable_balance';
COMMENT ON COLUMN public.telegram_users.bal_g4v7y IS 'Obfuscated: gcoin_v4_balance';
COMMENT ON COLUMN public.telegram_users.bal_a6c3z IS 'Obfuscated: alpha_coins';
COMMENT ON COLUMN public.telegram_users.addr_t9w2x IS 'Obfuscated: ton_wallet_address';

-- Update balance_backups table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_backups' AND column_name = 'pepe_balance') THEN
    ALTER TABLE public.balance_backups RENAME COLUMN pepe_balance TO bal_x7k9m;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_backups' AND column_name = 'pepe_withdrawable_balance') THEN
    ALTER TABLE public.balance_backups RENAME COLUMN pepe_withdrawable_balance TO bal_w5r2t;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'balance_backups' AND column_name = 'gcoin_v4_balance') THEN
    ALTER TABLE public.balance_backups RENAME COLUMN gcoin_v4_balance TO bal_g4v7y;
  END IF;
END $$;