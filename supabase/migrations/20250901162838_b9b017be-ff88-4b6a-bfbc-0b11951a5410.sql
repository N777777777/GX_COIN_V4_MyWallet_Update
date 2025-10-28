-- Create tables for real DEX functionality

-- Table for storing jetton tokens
CREATE TABLE public.jettons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  minter_address text NOT NULL UNIQUE,
  symbol text NOT NULL,
  name text NOT NULL,
  decimals integer NOT NULL DEFAULT 9,
  image_url text,
  description text,
  verified boolean DEFAULT false,
  total_supply numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table for storing AMM pools
CREATE TABLE public.dex_pools (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_address text NOT NULL UNIQUE,
  token0_address text NOT NULL, -- First token (usually TON)
  token1_address text NOT NULL, -- Second token (jetton)
  token0_symbol text NOT NULL,
  token1_symbol text NOT NULL,
  reserve0 numeric NOT NULL DEFAULT 0,
  reserve1 numeric NOT NULL DEFAULT 0,
  lp_token_address text,
  fee_bps integer NOT NULL DEFAULT 30, -- 0.3% fee in basis points
  tvl_usd numeric DEFAULT 0,
  volume_24h_usd numeric DEFAULT 0,
  price_token0 numeric DEFAULT 0,
  price_token1 numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table for storing swap transactions
CREATE TABLE public.dex_swaps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id uuid NOT NULL REFERENCES public.dex_pools(id),
  user_address text NOT NULL,
  token_in text NOT NULL,
  token_out text NOT NULL,
  amount_in numeric NOT NULL,
  amount_out numeric NOT NULL,
  price_impact numeric,
  transaction_hash text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Table for storing liquidity operations
CREATE TABLE public.dex_liquidity_operations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id uuid NOT NULL REFERENCES public.dex_pools(id),
  user_address text NOT NULL,
  operation_type text NOT NULL, -- 'add' or 'remove'
  token0_amount numeric NOT NULL,
  token1_amount numeric NOT NULL,
  lp_tokens numeric NOT NULL,
  transaction_hash text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.jettons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dex_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dex_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dex_liquidity_operations ENABLE ROW LEVEL SECURITY;

-- RLS policies for jettons
CREATE POLICY "Anyone can view jettons"
ON public.jettons FOR SELECT
USING (true);

CREATE POLICY "Service role can manage jettons"
ON public.jettons FOR ALL
USING (auth.role() = 'service_role');

-- RLS policies for dex_pools
CREATE POLICY "Anyone can view pools"
ON public.dex_pools FOR SELECT
USING (true);

CREATE POLICY "Service role can manage pools"
ON public.dex_pools FOR ALL
USING (auth.role() = 'service_role');

-- RLS policies for dex_swaps
CREATE POLICY "Anyone can view swaps"
ON public.dex_swaps FOR SELECT
USING (true);

CREATE POLICY "Service role can manage swaps"
ON public.dex_swaps FOR ALL
USING (auth.role() = 'service_role');

-- RLS policies for dex_liquidity_operations
CREATE POLICY "Anyone can view liquidity operations"
ON public.dex_liquidity_operations FOR SELECT
USING (true);

CREATE POLICY "Service role can manage liquidity operations"
ON public.dex_liquidity_operations FOR ALL
USING (auth.role() = 'service_role');

-- Add some initial jettons for testing
INSERT INTO public.jettons (minter_address, symbol, name, decimals, description, verified) VALUES
('EQD-cvR0Nz6XAyRBpDeaNumg7XGBnZpJQH8z0XXdpJ9wOKGw', 'TON', 'Toncoin', 9, 'Native TON cryptocurrency', true),
('EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', 'USDT', 'Tether USD', 6, 'Stablecoin pegged to USD', true),
('EQBlU_tKu_A8xDbwvU_XPk8hE3ZEe-9lphfY4eFb3PZFM0CZ', 'JETTON', 'Test Jetton', 9, 'Test jetton for DEX', false);

-- Add some initial pools
INSERT INTO public.dex_pools (pool_address, token0_address, token1_address, token0_symbol, token1_symbol, reserve0, reserve1, fee_bps) VALUES
('EQA1B2c3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3', 'EQD-cvR0Nz6XAyRBpDeaNumg7XGBnZpJQH8z0XXdpJ9wOKGw', 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', 'TON', 'USDT', 1000000000000, 5000000000, 30),
('EQB2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4', 'EQD-cvR0Nz6XAyRBpDeaNumg7XGBnZpJQH8z0XXdpJ9wOKGw', 'EQBlU_tKu_A8xDbwvU_XPk8hE3ZEe-9lphfY4eFb3PZFM0CZ', 'TON', 'JETTON', 500000000000, 1000000000000, 30);

-- Add indexes for better performance
CREATE INDEX idx_jettons_symbol ON public.jettons(symbol);
CREATE INDEX idx_jettons_verified ON public.jettons(verified);
CREATE INDEX idx_dex_pools_tokens ON public.dex_pools(token0_address, token1_address);
CREATE INDEX idx_dex_swaps_pool ON public.dex_swaps(pool_id);
CREATE INDEX idx_dex_swaps_user ON public.dex_swaps(user_address);
CREATE INDEX idx_dex_liquidity_pool ON public.dex_liquidity_operations(pool_id);
CREATE INDEX idx_dex_liquidity_user ON public.dex_liquidity_operations(user_address);