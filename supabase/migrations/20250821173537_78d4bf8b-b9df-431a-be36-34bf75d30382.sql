-- Security hardening for financial data exposure
-- Drop problematic public policies and create secure ones

-- Remove permissive public view policy from p2p_trades
DROP POLICY IF EXISTS "Public can view trades" ON public.p2p_trades;

-- Remove permissive policy from swap_transactions  
DROP POLICY IF EXISTS "Users can view their own swap transactions" ON public.swap_transactions;

-- Create service role policies for backend operations
CREATE POLICY "Service role manages p2p_trades"
ON public.p2p_trades
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages swap_transactions" 
ON public.swap_transactions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable RLS on ton_purchases if it exists
ALTER TABLE public.ton_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages ton_purchases"
ON public.ton_purchases
FOR ALL  
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create secure RPC function to get user's own financial transactions
CREATE OR REPLACE FUNCTION public.get_user_financial_transactions(p_telegram_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  u RECORD;
BEGIN
  SELECT * INTO u FROM public.telegram_users WHERE telegram_id = p_telegram_id;
  IF u IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'user_not_found');
  END IF;

  RETURN json_build_object(
    'success', true,
    'coin_claim_requests', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT id, claim_type, amount, burned_amount, status, created_at
        FROM public.coin_claim_requests
        WHERE telegram_user_id = u.id
        ORDER BY created_at DESC
        LIMIT 200
      ) t
    ),
    'completed_withdrawals', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT id, amount, status, wallet_address, transaction_hash, created_at, completed_at
        FROM public.completed_ton_withdrawals
        WHERE telegram_user_id = u.id
        ORDER BY created_at DESC
        LIMIT 200
      ) t
    ),
    'ton_purchases', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT id, ton_amount, coin_amount, transaction_hash, status, verified, completed_at, created_at
        FROM public.ton_purchases
        WHERE telegram_user_id = u.id
        ORDER BY created_at DESC
        LIMIT 200
      ) t
    ),
    'arcpay_payments', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT id, amount, status, currency, created_at, completed_at
        FROM public.arcpay_payments
        WHERE telegram_user_id = u.id
        ORDER BY created_at DESC
        LIMIT 200
      ) t
    )
  );
END;
$$;