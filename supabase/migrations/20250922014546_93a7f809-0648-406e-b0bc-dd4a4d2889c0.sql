-- Enable RLS on the last remaining table without security
ALTER TABLE public.recovery_backup_current_state ENABLE ROW LEVEL SECURITY;

-- Block all public access to recovery backup (service role only)
CREATE POLICY "Block all access to recovery backup" 
ON public.recovery_backup_current_state 
FOR ALL 
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role only recovery backup access" 
ON public.recovery_backup_current_state 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);