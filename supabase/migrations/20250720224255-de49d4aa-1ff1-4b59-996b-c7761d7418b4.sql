-- إنشاء مستخدم تجريبي ثانٍ للاختبار
INSERT INTO public.telegram_users (
  telegram_id, 
  username, 
  first_name, 
  coins, 
  ton_balance
) VALUES (
  999999, 
  'Test User 2', 
  'Test2', 
  5000, 
  10.0
) ON CONFLICT (telegram_id) DO UPDATE SET
  coins = EXCLUDED.coins,
  ton_balance = EXCLUDED.ton_balance;

-- إنشاء عرض بيع من المستخدم التجريبي
INSERT INTO public.p2p_orders (
  seller_id,
  order_type,
  coin_amount,
  ton_amount,
  price_per_coin,
  remaining_amount,
  status
) 
SELECT 
  id,
  'sell',
  200,
  20.0,
  0.1,
  200,
  'active'
FROM public.telegram_users 
WHERE telegram_id = 999999;