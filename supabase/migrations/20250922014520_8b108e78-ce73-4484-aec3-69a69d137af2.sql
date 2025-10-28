-- CRITICAL SECURITY FIX: Enable RLS and block access to financial backup tables
-- These tables contain sensitive financial data and currently have NO security

-- Enable RLS on all backup tables with financial data
ALTER TABLE public.ton_balance_restore_24_july_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ton_balance_restore_26_july_23utc_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ton_balance_restore_26_july_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ton_balance_restore_27_july_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balance_backup_20250727_v3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balance_backup_20250727_v4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balance_backup_before_1am_egypt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balance_backup_reset_to_25_july ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balance_final_restoration_backup ENABLE ROW LEVEL SECURITY;

-- Block all public access to backup tables (service role only)
CREATE POLICY "Block all access to backup tables" 
ON public.ton_balance_restore_24_july_backup 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only backup access" 
ON public.ton_balance_restore_24_july_backup 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all access to backup tables" 
ON public.ton_balance_restore_26_july_23utc_backup 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only backup access" 
ON public.ton_balance_restore_26_july_23utc_backup 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all access to backup tables" 
ON public.ton_balance_restore_26_july_backup 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only backup access" 
ON public.ton_balance_restore_26_july_backup 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all access to backup tables" 
ON public.ton_balance_restore_27_july_backup 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only backup access" 
ON public.ton_balance_restore_27_july_backup 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all access to backup tables" 
ON public.user_balance_backup_20250727_v3 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only backup access" 
ON public.user_balance_backup_20250727_v3 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all access to backup tables" 
ON public.user_balance_backup_20250727_v4 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only backup access" 
ON public.user_balance_backup_20250727_v4 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all access to backup tables" 
ON public.user_balance_backup_before_1am_egypt 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only backup access" 
ON public.user_balance_backup_before_1am_egypt 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all access to backup tables" 
ON public.user_balance_backup_reset_to_25_july 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only backup access" 
ON public.user_balance_backup_reset_to_25_july 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Block all access to backup tables" 
ON public.user_balance_final_restoration_backup 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only backup access" 
ON public.user_balance_final_restoration_backup 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);