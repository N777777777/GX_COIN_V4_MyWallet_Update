-- Fix security issue: Restrict access to wallet addresses in financial tables
-- These tables contain sensitive wallet addresses that could be used for blockchain tracking
-- Only users should see their own wallet data, and service role for admin operations

-- First, let's check if pending_ton_withdrawals has RLS enabled and create restrictive policies
ALTER TABLE public.pending_ton_withdrawals ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Users can view their own pending deposits" ON public.pending_ton_deposits;
DROP POLICY IF EXISTS "Users can create coin claim requests" ON public.coin_claim_requests;
DROP POLICY IF EXISTS "Users can view pending withdrawals" ON public.pending_ton_withdrawals;

-- Create strict policies for pending_ton_deposits
-- Only users can see their own deposits, service role has full access
CREATE POLICY "Users can view only their own deposits"
ON public.pending_ton_deposits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = pending_ton_deposits.telegram_user_id
      AND COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
  )
);

CREATE POLICY "Users can insert their own deposits"
ON public.pending_ton_deposits
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = pending_ton_deposits.telegram_user_id
      AND COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
  )
);

-- Block all other access to pending deposits
CREATE POLICY "Block unauthorized access to pending deposits"
ON public.pending_ton_deposits
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Create strict policies for coin_claim_requests  
-- Only users can see their own requests, service role has full access
CREATE POLICY "Users can view only their own claim requests"
ON public.coin_claim_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = coin_claim_requests.telegram_user_id
      AND COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
  )
);

-- Block all other access to claim requests except service role
CREATE POLICY "Block unauthorized access to claim requests"
ON public.coin_claim_requests
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Create strict policies for pending_ton_withdrawals
-- Only users can see their own withdrawals, service role has full access
CREATE POLICY "Users can view only their own pending withdrawals"
ON public.pending_ton_withdrawals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = pending_ton_withdrawals.telegram_user_id
      AND COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
  )
);

CREATE POLICY "Users can insert their own withdrawal requests"
ON public.pending_ton_withdrawals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = pending_ton_withdrawals.telegram_user_id
      AND COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
  )
);

-- Block all other access to pending withdrawals
CREATE POLICY "Block unauthorized access to pending withdrawals"
ON public.pending_ton_withdrawals
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Completed withdrawals should be even more restricted - only service role access
DROP POLICY IF EXISTS "Service role can manage completed withdrawals" ON public.completed_ton_withdrawals;

CREATE POLICY "Service role only access to completed withdrawals"
ON public.completed_ton_withdrawals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Block all public access to completed withdrawals
CREATE POLICY "Block all access to completed withdrawals except service"
ON public.completed_ton_withdrawals
FOR ALL
TO public
USING (false)
WITH CHECK (false);

-- Also secure any other tables that might contain wallet addresses
-- Check arcpay_payments table
CREATE POLICY "Users can view only their own payments"
ON public.arcpay_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = arcpay_payments.telegram_user_id
      AND COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
  )
);

-- Block unauthorized access to payments
CREATE POLICY "Block unauthorized access to payments"
ON public.arcpay_payments
FOR ALL
TO public
USING (false)
WITH CHECK (false);