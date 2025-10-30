-- إضافة بيانات أولية للبيكسة
-- إدراج TON كتوكن أساسي
INSERT INTO public.jettons (minter_address, symbol, name, description, decimals, total_supply, verified, image_url)
VALUES 
  ('TON', 'TON', 'The Open Network', 'العملة الأساسية لشبكة TON', 9, 5000000000, true, 'https://ton.org/download/ton_logo.png')
ON CONFLICT (minter_address) DO NOTHING;

-- إدراج بعض التوكنات التجريبية
INSERT INTO public.jettons (minter_address, symbol, name, description, decimals, total_supply, verified)
VALUES 
  ('EQtest1', 'USDT', 'Tether USD', 'عملة مستقرة مربوطة بالدولار', 6, 1000000000, true),
  ('EQtest2', 'DOGE', 'Dogecoin', 'عملة الكلب الشهيرة', 8, 100000000000, false),
  ('EQtest3', 'PEPE', 'Pepe Token', 'عملة الضفدع الشهيرة', 18, 420690000000000, false)
ON CONFLICT (minter_address) DO NOTHING;

-- إنشاء مجموعات سيولة أولية
INSERT INTO public.dex_pools (
  token0_address, token1_address, token0_symbol, token1_symbol, 
  reserve0, reserve1, fee_bps, pool_address, price_token0, price_token1, tvl_usd
) VALUES 
  ('TON', 'EQtest1', 'TON', 'USDT', 1000, 3090, 30, 'POOL_TON_USDT', 1, 3.09, 6180),
  ('TON', 'EQtest2', 'TON', 'DOGE', 500, 100000, 30, 'POOL_TON_DOGE', 1, 0.005, 3090),
  ('TON', 'EQtest3', 'TON', 'PEPE', 200, 50000000, 30, 'POOL_TON_PEPE', 1, 0.000004, 1236)
ON CONFLICT (pool_address) DO NOTHING;