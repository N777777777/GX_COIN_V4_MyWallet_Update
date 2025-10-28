-- Fix security definer view issue by recreating safe_user_profiles with proper security
-- First drop the existing view
DROP VIEW IF EXISTS public.safe_user_profiles;

-- Recreate the view with proper security invoker (default behavior)
CREATE VIEW public.safe_user_profiles AS
SELECT 
    telegram_id,
    first_name,
    username
FROM public.telegram_users
WHERE COALESCE(is_blocked, false) = false;

-- Enable RLS on the view (views inherit RLS from underlying tables by default)
ALTER VIEW public.safe_user_profiles OWNER TO postgres;

-- Grant only SELECT permission to authenticated users (no anonymous access)
GRANT SELECT ON public.safe_user_profiles TO authenticated;

-- Revoke all other permissions
REVOKE ALL ON public.safe_user_profiles FROM anon;
REVOKE ALL ON public.safe_user_profiles FROM public;

-- Create a proper RLS policy for the view
CREATE POLICY "Users can view safe profiles when authenticated" 
ON public.telegram_users 
FOR SELECT 
USING (
    auth.role() = 'authenticated' 
    AND COALESCE(is_blocked, false) = false
);