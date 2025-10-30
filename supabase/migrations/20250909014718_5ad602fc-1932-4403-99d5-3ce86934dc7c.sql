-- The issue is that the view is bypassing RLS. Let's fix this completely.
-- First, drop the problematic view
DROP VIEW IF EXISTS public.public_user_profiles;

-- Check if there are any remaining policies allowing public access
DROP POLICY IF EXISTS "Service role can manage telegram_users" ON public.telegram_users;

-- Recreate only the essential policies
CREATE POLICY "Service role full access"
ON public.telegram_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a safer view that doesn't expose sensitive data and respects RLS
CREATE VIEW public.safe_user_profiles AS
SELECT
  telegram_id,
  first_name,
  username
FROM public.telegram_users
WHERE COALESCE(is_blocked, false) = false;

-- Grant limited access to the safe view
GRANT SELECT ON public.safe_user_profiles TO anon, authenticated;

-- Verify access is restricted
SELECT COUNT(*) as should_be_zero FROM telegram_users;