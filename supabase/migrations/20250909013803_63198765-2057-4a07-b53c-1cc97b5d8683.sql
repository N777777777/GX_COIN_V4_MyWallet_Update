-- Fixed RLS policies with correct column names for each table
-- Enable RLS on critical tables that don't have it yet
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pepe_withdrawal_requests ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.ton_purchases ENABLE ROW LEVEL SECURITY;

-- Add basic policies for user_referrals
CREATE POLICY "Users can view referrals they created or are part of"
ON public.user_referrals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
      AND (s.telegram_id = referrer_telegram_id OR s.telegram_id = referred_telegram_id)
  )
);

CREATE POLICY "Service role can manage referrals"
ON public.user_referrals
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add policies for swap_transactions (using correct column name)
CREATE POLICY "Users can view their own swap transactions"
ON public.swap_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
      AND s.telegram_id = user_telegram_id
  )
);

CREATE POLICY "Service role can manage swap transactions"
ON public.swap_transactions
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add policies for pepe_withdrawal_requests (using correct column name)
CREATE POLICY "Users can view their own PEPE withdrawal requests"
ON public.pepe_withdrawal_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
      AND s.telegram_id = telegram_id
  )
);

CREATE POLICY "Service role can manage PEPE withdrawal requests"
ON public.pepe_withdrawal_requests
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add policies for ton_purchases (using correct column name)
CREATE POLICY "Users can view their own TON purchases"
ON public.ton_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE COALESCE(s.is_active, true) = true
      AND (s.expires_at IS NULL OR s.expires_at > now())
      AND s.session_token = public.get_request_header('x-session-token')
      -- Using user ID comparison through joins
      AND s.telegram_user_id = telegram_user_id
  )
);

CREATE POLICY "Service role can manage TON purchases"
ON public.ton_purchases
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);