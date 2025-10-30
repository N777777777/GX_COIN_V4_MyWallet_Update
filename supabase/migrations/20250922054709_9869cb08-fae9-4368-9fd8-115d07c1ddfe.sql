-- CRITICAL SECURITY FIX: Secure financial transaction tables from public access

-- Step 1: Secure completed_tasks table - contains task completion and reward data
DROP POLICY IF EXISTS "Users can view their own completed tasks" ON public.completed_tasks;
DROP POLICY IF EXISTS "Public can view completed tasks" ON public.completed_tasks;
DROP POLICY IF EXISTS "Anyone can view completed tasks" ON public.completed_tasks;

-- Users can only view their own completed tasks
CREATE POLICY "Users can view only their own completed tasks" ON public.completed_tasks
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = completed_tasks.telegram_user_id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

-- Step 2: Secure campaign_participants table - contains participation and reward data
DROP POLICY IF EXISTS "Anyone can view campaign participants" ON public.campaign_participants;
DROP POLICY IF EXISTS "Public can view campaign participants" ON public.campaign_participants;

-- Users can only view their own participation records
CREATE POLICY "Users can view only their own participation" ON public.campaign_participants
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = campaign_participants.user_id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

-- Campaign creators can view participants of their own campaigns
CREATE POLICY "Campaign creators can view their campaign participants" ON public.campaign_participants
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      JOIN user_sessions s ON s.telegram_user_id = c.creator_id
      WHERE c.id = campaign_participants.campaign_id
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

-- Step 3: Add service role access for administration
CREATE POLICY "Service role can manage completed tasks" ON public.completed_tasks
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage campaign participants" ON public.campaign_participants
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Step 4: Verify other financial tables are properly secured
-- coin_claim_requests and pending_ton_deposits already have proper security policies