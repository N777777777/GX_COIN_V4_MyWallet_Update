-- CRITICAL SECURITY FIX: Secure telegram_users table to prevent data theft

-- Step 1: Remove any overly permissive policies on telegram_users
DROP POLICY IF EXISTS "Public can view telegram users" ON public.telegram_users;
DROP POLICY IF EXISTS "Anyone can view telegram users" ON public.telegram_users;
DROP POLICY IF EXISTS "Users can view all telegram users" ON public.telegram_users;

-- Step 2: Create secure policies that protect personal information

-- Users can only view their own profile data
CREATE POLICY "Users can view only their own profile" ON public.telegram_users
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = telegram_users.id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

-- Users can update only their own profile data  
CREATE POLICY "Users can update only their own profile" ON public.telegram_users
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = telegram_users.id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

-- Users can insert their own profile (for registration)
CREATE POLICY "Users can create their own profile" ON public.telegram_users
  FOR INSERT 
  WITH CHECK (
    -- Allow creation during registration process
    true
  );

-- Service role has full administrative access
CREATE POLICY "Service role has full access to telegram users" ON public.telegram_users
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Step 3: For specific use cases where limited user data needs to be visible 
-- (like leaderboards, referrals), create a secure view with only non-sensitive data

CREATE OR REPLACE VIEW public.safe_user_profiles 
WITH (security_invoker=on) AS
SELECT 
  id,
  telegram_id,
  first_name,
  username,
  created_at
FROM public.telegram_users
WHERE EXISTS (
  SELECT 1 FROM user_sessions s 
  WHERE COALESCE(s.is_active, true) = true 
  AND (s.expires_at IS NULL OR s.expires_at > now()) 
  AND s.session_token = get_request_header('x-session-token')
);

-- Grant access to the safe view
GRANT SELECT ON public.safe_user_profiles TO authenticated, anon;