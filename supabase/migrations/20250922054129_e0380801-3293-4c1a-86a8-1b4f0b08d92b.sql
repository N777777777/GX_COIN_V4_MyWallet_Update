-- Fix financial data exposure by securing existing overly permissive policies

-- Step 1: Remove overly permissive p2p_orders policy
DROP POLICY IF EXISTS "Public can view active orders" ON public.p2p_orders;

-- Step 2: Remove overly permissive frozen_balances policy  
DROP POLICY IF EXISTS "Public can view frozen balances" ON public.frozen_balances;

-- Step 3: Remove existing user-specific policies before recreating them
DROP POLICY IF EXISTS "Users can view only their own frozen balances" ON public.frozen_balances;
DROP POLICY IF EXISTS "Authenticated users can view active orders" ON public.p2p_orders;

-- Step 4: Create secure replacement policies

-- Secure p2p_orders: Only authenticated users can view orders
CREATE POLICY "Authenticated users can view active p2p orders" ON public.p2p_orders
  FOR SELECT 
  USING (
    status IN ('active', 'partially_filled') AND 
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

-- Secure frozen_balances: Users can only view their own frozen balances
CREATE POLICY "User own frozen balance access" ON public.frozen_balances
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = frozen_balances.user_id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

-- Step 5: Ensure admin access for service role
CREATE POLICY "Admin access to p2p orders" ON public.p2p_orders
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admin access to frozen balances" ON public.frozen_balances
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');