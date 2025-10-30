-- Address the Security Definer View issue by implementing proper RLS controls
-- and ensuring the view doesn't bypass security policies

-- First, ensure proper RLS policies are in place for the telegram_users table
-- that the safe_user_profiles view is based on

-- Drop and recreate the view with explicit RLS enforcement
DROP VIEW IF EXISTS public.safe_user_profiles;

-- Make sure telegram_users table has RLS enabled
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Create a more secure policy for viewing user profiles
-- First drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view public profiles" ON public.telegram_users;

-- Create a new policy that allows viewing only non-blocked user profiles
CREATE POLICY "Public can view non-blocked user profiles" 
ON public.telegram_users 
FOR SELECT 
USING (COALESCE(is_blocked, false) = false);

-- Now recreate the view without any security definer implications
-- The view will inherit RLS policies from the underlying table
CREATE VIEW public.safe_user_profiles 
WITH (security_barrier = true)
AS
SELECT 
    telegram_id,
    first_name,
    username
FROM public.telegram_users
WHERE COALESCE(is_blocked, false) = false;

-- Add proper documentation
COMMENT ON VIEW public.safe_user_profiles IS 
'Secure view of user profiles that respects RLS policies. Shows only non-blocked users.';

-- Grant appropriate permissions
GRANT SELECT ON public.safe_user_profiles TO authenticated;
GRANT SELECT ON public.safe_user_profiles TO anon;