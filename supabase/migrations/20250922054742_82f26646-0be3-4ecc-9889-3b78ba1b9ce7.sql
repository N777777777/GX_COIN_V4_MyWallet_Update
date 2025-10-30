-- CRITICAL SECURITY FIX: Secure financial transaction tables - Phase 2

-- Step 1: Remove overly permissive policies on campaign_participants
DROP POLICY IF EXISTS "Anyone can view campaign participants" ON public.campaign_participants;
DROP POLICY IF EXISTS "Public can view campaign participants" ON public.campaign_participants;

-- Step 2: Remove existing user policies before recreating them
DROP POLICY IF EXISTS "Users can view only their own participation" ON public.campaign_participants;
DROP POLICY IF EXISTS "Campaign creators can view their campaign participants" ON public.campaign_participants;

-- Step 3: Create secure policies for campaign_participants

-- Users can only view their own participation records
CREATE POLICY "Secure user participation view" ON public.campaign_participants
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
CREATE POLICY "Secure campaign creator participant view" ON public.campaign_participants
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

-- Step 4: Update completed_tasks if it has overly permissive policies
DROP POLICY IF EXISTS "Users can view their own completed tasks" ON public.completed_tasks;

-- Ensure completed_tasks has secure access
CREATE POLICY "Secure completed tasks view" ON public.completed_tasks
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

-- Step 5: Add service role access for administration
CREATE POLICY "Admin access to completed tasks" ON public.completed_tasks
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admin access to campaign participants" ON public.campaign_participants
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');