-- Fix the security definer view issue by properly securing the safe_user_profiles view
-- Remove overly permissive permissions and set appropriate access controls

-- Revoke all permissions from everyone
REVOKE ALL ON public.safe_user_profiles FROM PUBLIC;
REVOKE ALL ON public.safe_user_profiles FROM anon;
REVOKE ALL ON public.safe_user_profiles FROM authenticated;

-- Grant only SELECT to authenticated users (removing write permissions)
GRANT SELECT ON public.safe_user_profiles TO authenticated;

-- Grant service role access for admin operations
GRANT ALL ON public.safe_user_profiles TO service_role;