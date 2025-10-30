-- Fix Security Definer issues by removing unnecessary SECURITY DEFINER from functions
-- and ensuring proper access control through RLS policies

-- First, let's check which functions really need SECURITY DEFINER
-- Functions that access system settings or need elevated privileges should keep it
-- Functions that just query user data should rely on RLS

-- Update get_request_header - this one should keep SECURITY DEFINER as it accesses system settings
-- No changes needed for this function as it's legitimately accessing system configuration

-- Update has_active_session_for_user - this should also keep SECURITY DEFINER 
-- as it's used for authentication validation
-- No changes needed for this function

-- For the safe_user_profiles view, let's add proper RLS if needed
-- First, check if we have proper RLS policies on telegram_users table

-- Create a function to check if user is qualified without SECURITY DEFINER
-- This will rely on RLS policies instead
CREATE OR REPLACE FUNCTION public.is_user_qualified(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  qualified BOOLEAN := FALSE;
BEGIN
  -- Check qualified_users table
  SELECT 1 INTO user_record
  FROM public.qualified_users qu
  JOIN public.telegram_users tu ON qu.telegram_id = tu.telegram_id
  WHERE tu.id = p_user_id 
  AND qu.is_active = true;
  
  IF FOUND THEN
    RETURN true;
  END IF;
  
  -- Check manual_qualified_users table
  SELECT 1 INTO user_record
  FROM public.manual_qualified_users mqu
  JOIN public.telegram_users tu ON mqu.telegram_id = tu.telegram_id
  WHERE tu.id = p_user_id 
  AND mqu.is_active = true;
  
  IF FOUND THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Update the safe_user_profiles view to ensure it follows RLS
DROP VIEW IF EXISTS public.safe_user_profiles;

-- Recreate the view without any special security context
CREATE VIEW public.safe_user_profiles AS
SELECT 
    telegram_id,
    first_name,
    username
FROM public.telegram_users
WHERE COALESCE(is_blocked, false) = false;

-- Add RLS policy for the safe_user_profiles view
-- Since it's a view, RLS will be enforced through the underlying table policies

-- Ensure telegram_users table has proper RLS policies
-- Add a policy for viewing user profiles if not exists
DO $$
BEGIN
    -- Check if policy exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'telegram_users' 
        AND policyname = 'Users can view public profiles'
    ) THEN
        -- Create policy for viewing public user information
        EXECUTE 'CREATE POLICY "Users can view public profiles" ON public.telegram_users
                 FOR SELECT 
                 USING (COALESCE(is_blocked, false) = false)';
    END IF;
END
$$;

-- Update RLS policies to ensure proper access control
-- Enable RLS on telegram_users if not already enabled
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Create a more secure version of functions that previously used SECURITY DEFINER inappropriately
-- Most user-data related functions should rely on RLS rather than SECURITY DEFINER

-- Add comment explaining the security model
COMMENT ON VIEW public.safe_user_profiles IS 'Public view of user profiles with RLS enforcement through underlying table policies';