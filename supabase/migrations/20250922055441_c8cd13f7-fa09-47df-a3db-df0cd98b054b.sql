-- CRITICAL SECURITY FIX: Secure all financial transaction tables from public access

-- Step 1: Secure daily_logins table - contains reward tracking data
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view daily logins" ON public.daily_logins;
DROP POLICY IF EXISTS "Anyone can view daily logins" ON public.daily_logins;

-- Users can only view their own daily login rewards
CREATE POLICY "Users can view only their own daily logins" ON public.daily_logins
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = daily_logins.telegram_user_id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

-- Step 2: Secure daily_ad_rewards table - contains earnings data
ALTER TABLE public.daily_ad_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view daily ad rewards" ON public.daily_ad_rewards;
DROP POLICY IF EXISTS "Anyone can view daily ad rewards" ON public.daily_ad_rewards;

-- Users can only view their own ad rewards
CREATE POLICY "Users can view only their own ad rewards" ON public.daily_ad_rewards
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = daily_ad_rewards.user_id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

-- Step 3: Double-check coin_claim_requests policies (should already be secure)
-- Verify existing secure policies are in place
DROP POLICY IF EXISTS "Public can view coin claim requests" ON public.coin_claim_requests;
DROP POLICY IF EXISTS "Anyone can view coin claim requests" ON public.coin_claim_requests;

-- Step 4: Double-check pending_ton_deposits policies
-- Remove any overly permissive policies
DROP POLICY IF EXISTS "Public can view pending deposits" ON public.pending_ton_deposits;

-- Step 5: Add service role access for administration on all financial tables
CREATE POLICY "Service role can manage daily logins" ON public.daily_logins
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage daily ad rewards" ON public.daily_ad_rewards
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Step 6: Secure any other potential financial tables
-- Secure daily_wheel_spins (prize amounts)
ALTER TABLE public.daily_wheel_spins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view wheel spins" ON public.daily_wheel_spins;

CREATE POLICY "Users can view only their own wheel spins" ON public.daily_wheel_spins
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = daily_wheel_spins.telegram_user_id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

CREATE POLICY "Service role can manage wheel spins" ON public.daily_wheel_spins
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');