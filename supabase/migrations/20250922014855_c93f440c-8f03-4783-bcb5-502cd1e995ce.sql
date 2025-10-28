-- Fix the remaining RLS disabled table
-- Enable RLS on the recovery backup table
ALTER TABLE public.recovery_backup_current_state ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies - only service role access
CREATE POLICY "Block all public access to recovery backup" 
ON public.recovery_backup_current_state 
FOR ALL 
TO public
USING (false) 
WITH CHECK (false);

CREATE POLICY "Service role can manage recovery backup" 
ON public.recovery_backup_current_state 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);