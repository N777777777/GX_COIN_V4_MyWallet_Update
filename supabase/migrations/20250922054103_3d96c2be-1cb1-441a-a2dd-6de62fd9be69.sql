-- Fix financial data exposure by removing overly permissive policies

-- Remove existing overly permissive policies and replace with secure ones
-- Do this with explicit DROP IF EXISTS first

-- 1. Fix p2p_orders - currently allows public viewing
DROP POLICY IF EXISTS "Public can view active orders" ON public.p2p_orders;

-- Replace with authenticated access only
CREATE POLICY "Authenticated users can view active orders" ON public.p2p_orders
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

-- 2. Fix frozen_balances - currently allows public viewing  
DROP POLICY IF EXISTS "Public can view frozen balances" ON public.frozen_balances;

-- Replace with user-specific access only
CREATE POLICY "Users can view only their own frozen balances" ON public.frozen_balances
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

-- 3. Ensure swap_transactions table exists and is properly secured
CREATE TABLE IF NOT EXISTS public.swap_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_telegram_id bigint NOT NULL,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  from_amount numeric NOT NULL,
  to_amount numeric NOT NULL,
  exchange_rate numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on swap_transactions if not already enabled
DO $$ 
BEGIN
  IF NOT (SELECT polrelid FROM pg_policies WHERE schemaname = 'public' AND tablename = 'swap_transactions' LIMIT 1) IS NOT NULL THEN
    ALTER TABLE public.swap_transactions ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add admin access policies for service role
DROP POLICY IF EXISTS "Service role can manage p2p orders" ON public.p2p_orders;
CREATE POLICY "Service role can manage p2p orders" ON public.p2p_orders
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage frozen balances" ON public.frozen_balances;  
CREATE POLICY "Service role can manage frozen balances" ON public.frozen_balances
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');