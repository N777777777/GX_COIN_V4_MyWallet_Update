-- Fix the Security Definer View issue by setting security_invoker=on
-- This ensures the view respects RLS policies and uses the calling user's permissions

-- Drop the current view
DROP VIEW IF EXISTS public.safe_user_profiles;

-- Recreate the view with SECURITY INVOKER mode to respect RLS policies
CREATE VIEW public.safe_user_profiles 
WITH (security_invoker=on)
AS
SELECT 
    telegram_id,
    first_name,
    username
FROM public.telegram_users
WHERE COALESCE(is_blocked, false) = false;

-- Add proper documentation
COMMENT ON VIEW public.safe_user_profiles IS 
'Secure view of user profiles with SECURITY INVOKER mode that respects RLS policies and caller permissions. Shows only non-blocked users.';

-- Grant appropriate permissions
GRANT SELECT ON public.safe_user_profiles TO authenticated;
GRANT SELECT ON public.safe_user_profiles TO anon;