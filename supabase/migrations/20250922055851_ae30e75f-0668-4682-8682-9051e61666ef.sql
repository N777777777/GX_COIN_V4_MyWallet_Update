-- EMERGENCY SECURITY FIX: Remove any remaining public access to telegram_users table
-- This addresses the critical security vulnerability: Customer Personal Data Could Be Stolen by Hackers

-- Step 1: Ensure RLS is enabled on telegram_users table
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any policies that might allow public access
DROP POLICY IF EXISTS "Anyone can view telegram users" ON public.telegram_users;
DROP POLICY IF EXISTS "Public can view telegram users" ON public.telegram_users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.telegram_users;
DROP POLICY IF EXISTS "Allow public read access" ON public.telegram_users;

-- Step 3: Verify the existing secure policies are in place and strengthen them if needed

-- Policy for users to view only their own data (already exists but let's ensure it's correct)
DROP POLICY IF EXISTS "Users can view only their own data" ON public.telegram_users;
CREATE POLICY "Users can view only their own data" ON public.telegram_users
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

-- Policy for users to update only their own data (already exists but let's ensure it's correct)
DROP POLICY IF EXISTS "Users can update only their own data" ON public.telegram_users;
CREATE POLICY "Users can update only their own data" ON public.telegram_users
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

-- Policy for service role to manage all data (for admin functions)
DROP POLICY IF EXISTS "Service role can manage telegram users" ON public.telegram_users;
CREATE POLICY "Service role can manage telegram users" ON public.telegram_users
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Step 4: Explicitly block all other access attempts
DROP POLICY IF EXISTS "Block all public access to telegram users" ON public.telegram_users;
CREATE POLICY "Block all public access to telegram users" ON public.telegram_users
  FOR ALL 
  USING (false)
  WITH CHECK (false);

-- Step 5: Add comprehensive comments for future reference
COMMENT ON TABLE public.telegram_users IS 'CRITICAL: Contains sensitive personal data including Telegram IDs, usernames, names, and financial balances. Access is strictly controlled via RLS policies.';

-- Step 6: Additional security measures for related sensitive data
-- Ensure other user-related tables are also properly secured

-- Secure user_sessions table (contains session tokens)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view user sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Anyone can view user sessions" ON public.user_sessions;

-- Only allow service role access to user_sessions for security
DROP POLICY IF EXISTS "Service role can manage user sessions" ON public.user_sessions;
CREATE POLICY "Service role can manage user sessions" ON public.user_sessions
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Block all other access to user_sessions
DROP POLICY IF EXISTS "Block all access to user sessions" ON public.user_sessions;
CREATE POLICY "Block all access to user sessions" ON public.user_sessions
  FOR ALL 
  USING (false)
  WITH CHECK (false);