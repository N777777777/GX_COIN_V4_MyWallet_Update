
-- Phase 1: Lock down critical RLS policies

-- 1) telegram_users: block public updates and fix insert policy to service_role only
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Drop dangerous public update policy
DROP POLICY IF EXISTS "Enable update for all users" ON public.telegram_users;

-- Fix insert policy: ensure only service_role can insert
DROP POLICY IF EXISTS "Enable insert for service role" ON public.telegram_users;

CREATE POLICY "Only service role can insert telegram_users"
  ON public.telegram_users
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Optional (Phase 2): later we will restrict SELECT to least-privilege, but keep for now to avoid breaking all reads
-- DROP POLICY IF EXISTS "Enable read access for all users" ON public.telegram_users;
-- CREATE POLICY "Restrict read of telegram_users (temporary allow public read or migrate to RPC)"
--   ON public.telegram_users
--   FOR SELECT
--   USING (true);

-- 2) Lock down sensitive financial tables to stop PII leaks (wallets, amounts)
-- pending_ton_withdrawals: remove public SELECT
DROP POLICY IF EXISTS "Users can view their own pending withdrawals" ON public.pending_ton_withdrawals;

-- completed_ton_withdrawals: remove public SELECT
DROP POLICY IF EXISTS "Users can view their own completed withdrawals" ON public.completed_ton_withdrawals;

-- arcpay_payments: remove public SELECT
DROP POLICY IF EXISTS "Users can view their own ArcPay payments" ON public.arcpay_payments;

-- coin_claim_requests: remove public SELECT
DROP POLICY IF EXISTS "Users can view coin claim requests" ON public.coin_claim_requests;

-- After dropping these policies, non-service roles cannot read these tables directly.
-- Frontend will be updated to use secure Edge Functions for per-user access.

