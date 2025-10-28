-- Drop existing policies to avoid conflicts and recreate them properly
DROP POLICY IF EXISTS "Users can view referrals they created or are part of" ON public.user_referrals;
DROP POLICY IF EXISTS "Service role can manage referrals" ON public.user_referrals;
DROP POLICY IF EXISTS "Users can view their own swap transactions" ON public.swap_transactions;
DROP POLICY IF EXISTS "Service role can manage swap transactions" ON public.swap_transactions;
DROP POLICY IF EXISTS "Users can view their own PEPE withdrawal requests" ON public.pepe_withdrawal_requests;
DROP POLICY IF EXISTS "Service role can manage PEPE withdrawal requests" ON public.pepe_withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own TON purchases" ON public.ton_purchases;
DROP POLICY IF EXISTS "Service role can manage TON purchases" ON public.ton_purchases;

-- Enable RLS on critical tables (ignore if already enabled)
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pepe_withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ton_purchases ENABLE ROW LEVEL SECURITY;

-- Create simplified policies that allow service role access and basic user access
-- For user_referrals
CREATE POLICY "Service role can manage all referrals"
ON public.user_referrals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- For swap_transactions  
CREATE POLICY "Service role can manage all swap transactions"
ON public.swap_transactions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- For pepe_withdrawal_requests
CREATE POLICY "Service role can manage all PEPE withdrawals"
ON public.pepe_withdrawal_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- For ton_purchases
CREATE POLICY "Service role can manage all TON purchases"
ON public.ton_purchases
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);