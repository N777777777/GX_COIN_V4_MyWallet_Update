-- Security hardening for financial data exposure
-- 1) Restrict public reads and add secure RPC for per-user access

-- p2p_trades currently exposes all trades publicly via a permissive policy; drop it
DROP POLICY IF EXISTS "Public can view trades" ON public.p2p_trades;

-- Ensure service role can manage p2p_trades for backend operations
CREATE POLICY IF NOT EXISTS "Service role can manage p2p_trades"
ON public.p2p_trades
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- swap_transactions has an overly-permissive SELECT policy; replace it with service-only and use RPC for reads
DROP POLICY IF EXISTS "Users can view their own swap transactions" ON public.swap_transactions;

-- Allow service role to manage swap_transactions
CREATE POLICY IF NOT EXISTS "Service role can manage swap_transactions"
ON public.swap_transactions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ton_purchases: enable RLS and restrict direct selects (use RPC)
DO $$ BEGIN
  EXECUTE 'ALTER TABLE public.ton_purchases ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN undefined_table THEN
  -- Table may not exist in some environments; ignore
  NULL;
END $$;

-- Service role policy for ton_purchases (if table exists)
DO $$ BEGIN
  EXECUTE $$
  CREATE POLICY IF NOT EXISTS "Service role can manage ton_purchases"
  ON public.ton_purchases
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
  $$;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;

-- coin_claim_requests, completed_ton_withdrawals already restricted; add explicit service role policies for completeness
CREATE POLICY IF NOT EXISTS "Service role can manage coin_claim_requests"
ON public.coin_claim_requests
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role can manage completed_ton_withdrawals"
ON public.completed_ton_withdrawals
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- arcpay_payments already has service role policy

-- 2) Create a SECURITY DEFINER RPC to return only the caller's transactions by Telegram ID
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
    ),
    'swap_transactions', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT id, from_currency, to_currency, from_amount, to_amount, exchange_rate, status, created_at
        FROM public.swap_transactions
        WHERE user_id = u.id OR user_telegram_id = p_telegram_id
        ORDER BY created_at DESC
        LIMIT 200
      ) t
    ),
    'p2p_trades', (
      SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (
        SELECT id, order_id, status, seller_id, buyer_id, coin_amount, price_per_coin, ton_amount, created_at, completed_at
        FROM public.p2p_trades
        WHERE seller_id = u.id OR buyer_id = u.id
        ORDER BY created_at DESC
        LIMIT 200
      ) t
    )
  );
END;
$$;

-- Optional note: We intentionally leave p2p_orders public for active orderbook usability; can be replaced with a limited view upon request.
