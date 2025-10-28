-- Fix financial data exposure by securing RLS policies - Phase 2

-- First, let's ensure swap_transactions table exists with proper structure
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

ALTER TABLE public.swap_transactions ENABLE ROW LEVEL SECURITY;

-- Secure swap_transactions table
DROP POLICY IF EXISTS "Anyone can view swap transactions" ON public.swap_transactions;
DROP POLICY IF EXISTS "Public can view swap transactions" ON public.swap_transactions;

CREATE POLICY "Users can view only their own swap transactions" ON public.swap_transactions
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = swap_transactions.user_id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

CREATE POLICY "Users can insert their own swap transactions" ON public.swap_transactions
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_sessions s 
      WHERE s.telegram_user_id = swap_transactions.user_id 
      AND COALESCE(s.is_active, true) = true 
      AND (s.expires_at IS NULL OR s.expires_at > now()) 
      AND s.session_token = get_request_header('x-session-token')
    )
  );

CREATE POLICY "Service role can manage swap transactions" ON public.swap_transactions
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update p2p_orders table policies to require authentication
DROP POLICY IF EXISTS "Public can view active orders" ON public.p2p_orders;

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

CREATE POLICY "Service role can manage p2p orders" ON public.p2p_orders
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update frozen_balances table policies
DROP POLICY IF EXISTS "Public can view frozen balances" ON public.frozen_balances;

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

CREATE POLICY "Service role can manage frozen balances" ON public.frozen_balances
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add service role access for pending deposits
CREATE POLICY "Service role can manage pending deposits" ON public.pending_ton_deposits
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');