-- Add RLS restrictions for read_only_user as well
-- The issue is that supabase_read_only_user bypasses RLS by default
-- We need to create a restrictive policy that applies to all roles

-- First, let's create a very restrictive policy for non-service roles
DROP POLICY IF EXISTS "Users can view own telegram_users row" ON public.telegram_users;
DROP POLICY IF EXISTS "Users can update own telegram_users row" ON public.telegram_users;
DROP POLICY IF EXISTS "Users can create telegram_users (bootstrap)" ON public.telegram_users;

-- Create policies that explicitly block unauthorized access
CREATE POLICY "Block all direct access except service role"
ON public.telegram_users
FOR ALL
TO public
USING (false)
WITH CHECK (false);

CREATE POLICY "Service role only"
ON public.telegram_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a restrictive policy for authenticated users with session validation
CREATE POLICY "Authenticated users with valid session only"
ON public.telegram_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = telegram_users.id
      AND COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
  )
);

-- Allow bootstrap creation for new users (limited to service role operations)
CREATE POLICY "Service role can insert"
ON public.telegram_users
FOR INSERT
TO service_role
WITH CHECK (true);

-- Test access restriction
SELECT COUNT(*) as should_be_zero_now FROM telegram_users;