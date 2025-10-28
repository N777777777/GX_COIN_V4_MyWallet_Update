-- Create coin_claim_requests table for handling coin claim requests
CREATE TABLE IF NOT EXISTS public.coin_claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id UUID NOT NULL,
  telegram_id BIGINT NOT NULL,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('qualified','unqualified')),
  amount NUMERIC NOT NULL,
  burned_amount NUMERIC NOT NULL DEFAULT 0,
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_claim_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Service role can manage coin claim requests"
ON public.coin_claim_requests
AS PERMISSIVE
FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view coin claim requests"
ON public.coin_claim_requests
AS PERMISSIVE
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can create coin claim requests"
ON public.coin_claim_requests
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);

-- Trigger to update updated_at on updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_coin_claim_requests_updated_at'
  ) THEN
    CREATE TRIGGER update_coin_claim_requests_updated_at
    BEFORE UPDATE ON public.coin_claim_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;