-- Fix Security Definer View issue
-- Drop and recreate the safe_user_profiles view without SECURITY DEFINER

DROP VIEW IF EXISTS public.safe_user_profiles;

-- Recreate the view as a normal view (without SECURITY DEFINER)
CREATE VIEW public.safe_user_profiles AS
SELECT 
    telegram_id,
    first_name,
    username
FROM public.telegram_users
WHERE COALESCE(is_blocked, false) = false;

-- Grant appropriate permissions
GRANT SELECT ON public.safe_user_profiles TO anon, authenticated;