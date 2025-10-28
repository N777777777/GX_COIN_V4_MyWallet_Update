-- Enable RLS on telegram_users and add session-based policies without breaking current app flows
-- Create helper to read request headers safely
CREATE OR REPLACE FUNCTION public.get_request_header(header_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  headers jsonb;
BEGIN
  headers := current_setting('request.headers', true)::jsonb;
  RETURN COALESCE(headers ->> lower(header_name), '');
END;
$$;

-- Validate if the incoming request has an active session for the given user
CREATE OR REPLACE FUNCTION public.has_active_session_for_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_sessions s
    WHERE s.telegram_user_id = p_user_id
      AND COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
  );
$$;

-- Enable Row Level Security on telegram_users
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- POLICY: Allow users to select only their own row when they provide a valid session token
DROP POLICY IF EXISTS "Users can view own telegram_users row" ON public.telegram_users;
CREATE POLICY "Users can view own telegram_users row"
ON public.telegram_users
FOR SELECT
USING (public.has_active_session_for_user(id));

-- POLICY: Allow users to update only their own row when they provide a valid session token
DROP POLICY IF EXISTS "Users can update own telegram_users row" ON public.telegram_users;
CREATE POLICY "Users can update own telegram_users row"
ON public.telegram_users
FOR UPDATE
USING (public.has_active_session_for_user(id))
WITH CHECK (public.has_active_session_for_user(id));

-- POLICY: Allow inserting new telegram_users records (bootstrap). Rely on existing unique constraints to prevent duplicates.
DROP POLICY IF EXISTS "Users can create telegram_users (bootstrap)" ON public.telegram_users;
CREATE POLICY "Users can create telegram_users (bootstrap)"
ON public.telegram_users
FOR INSERT
WITH CHECK (true);

-- Optional: service role can manage (explicit, though service_role normally bypasses RLS)
DROP POLICY IF EXISTS "Service role can manage telegram_users" ON public.telegram_users;
CREATE POLICY "Service role can manage telegram_users"
ON public.telegram_users
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create a public view exposing only non-sensitive fields for leaderboards and public listings
CREATE OR REPLACE VIEW public.public_user_profiles AS
SELECT
  id,
  telegram_id,
  first_name,
  username,
  referral_tier,
  total_referrals_count
FROM public.telegram_users
WHERE COALESCE(is_blocked, false) = false;

-- Grant read access on the view to anon and authenticated
GRANT SELECT ON public.public_user_profiles TO anon, authenticated;