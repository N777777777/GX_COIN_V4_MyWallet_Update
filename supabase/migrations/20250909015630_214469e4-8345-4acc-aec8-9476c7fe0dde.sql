-- Fix security issue: Enable RLS on all backup tables containing sensitive user data
-- These tables contain Telegram IDs, usernames, first names, and financial balances
-- that should not be publicly accessible

-- Enable RLS on all backup tables
ALTER TABLE public.coins_restore_24_july_23utc_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_state_backup_before_july25_restore ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_state_backup_emergency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_coins_fix_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_restoration_current_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_buyers_restoration_backup ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies - only service role can access backup data
CREATE POLICY "Service role only access to coins restore backup"
ON public.coins_restore_24_july_23utc_backup
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role only access to current state backup before july25"
ON public.current_state_backup_before_july25_restore
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role only access to emergency backup"
ON public.current_state_backup_emergency
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role only access to final coins fix backup"
ON public.final_coins_fix_backup
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role only access to final restoration backup"
ON public.final_restoration_current_backup
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role only access to p2p buyers restoration backup"
ON public.p2p_buyers_restoration_backup
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Block all other access explicitly
CREATE POLICY "Block public access to coins restore backup"
ON public.coins_restore_24_july_23utc_backup
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public access to current state backup before july25"
ON public.current_state_backup_before_july25_restore
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public access to final coins fix backup"
ON public.final_coins_fix_backup
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public access to final restoration backup"
ON public.final_restoration_current_backup
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public access to p2p buyers restoration backup"
ON public.p2p_buyers_restoration_backup
FOR ALL
TO public
USING (false)
WITH CHECK (false);