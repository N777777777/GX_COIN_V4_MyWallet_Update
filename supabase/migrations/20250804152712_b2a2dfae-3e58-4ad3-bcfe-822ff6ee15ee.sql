-- Fix RLS policies for existing security_violations table
DROP POLICY IF EXISTS "Service role can manage security violations" ON public.security_violations;

-- Enable RLS (in case it's not enabled)
ALTER TABLE public.security_violations ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policy
CREATE POLICY "Service role can manage security violations" 
ON public.security_violations 
FOR ALL 
TO service_role 
USING (true);