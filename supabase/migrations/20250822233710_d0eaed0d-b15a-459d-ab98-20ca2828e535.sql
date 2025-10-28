-- إضافة مهام شركاء جديدة
INSERT INTO public.partner_tasks (
  title,
  description,
  reward_amount,
  task_url,
  partner_name,
  partner_logo_url,
  task_type,
  is_active,
  max_participants,
  end_date
) VALUES 
-- مهمة Binance
(
  'انضم إلى قناة Binance الرسمية',
  'انضم إلى قناة Binance الرسمية واحصل على آخر الأخبار والتحديثات',
  50,
  'https://t.me/binance',
  'Binance',
  'https://public.bnbstatic.com/image/cms/blog/20200414/71c24b03-2b84-4a4b-8d14-f2b77c5a8e60.png',
  'partner',
  true,
  10000,
  '2025-02-28 23:59:59'
),
-- مهمة Bybit
(
  'اشترك في قناة Bybit',
  'انضم إلى مجتمع Bybit واحصل على إشارات التداول المجانية',
  75,
  'https://t.me/bybitcommunity',
  'Bybit',
  'https://cdn.worldvectorlogo.com/logos/bybit-1.svg',
  'partner',
  true,
  5000,
  '2025-03-15 23:59:59'
),
-- مهمة OKX
(
  'انضم إلى قناة OKX العربية',
  'تابع آخر أخبار وتحديثات منصة OKX باللغة العربية',
  60,
  'https://t.me/okx_arabic',
  'OKX',
  'https://www.okx.com/cdn/assets/imgs/221/58E63FEA47A2B7D7.png',
  'partner',
  true,
  8000,
  '2025-03-31 23:59:59'
),
-- مهمة CoinMarketCap
(
  'تابع CoinMarketCap على تليجرام',
  'احصل على تحديثات أسعار العملات المشفرة من CoinMarketCap',
  40,
  'https://t.me/CoinMarketCap',
  'CoinMarketCap',
  'https://coinmarketcap.com/favicon.ico',
  'partner',
  true,
  15000,
  '2025-04-30 23:59:59'
),
-- مهمة Trust Wallet
(
  'انضم إلى مجتمع Trust Wallet',
  'تعلم كيفية استخدام محفظة Trust Wallet بأمان',
  55,
  'https://t.me/trustwallet',
  'Trust Wallet',
  'https://trustwallet.com/assets/images/favicon.ico',
  'partner',
  true,
  12000,
  '2025-03-20 23:59:59'
),
-- مهمة Crypto News
(
  'تابع أخبار العملات المشفرة',
  'احصل على آخر الأخبار في عالم العملات المشفرة',
  30,
  'https://t.me/cryptonews',
  'Crypto News',
  null,
  'partner',
  true,
  20000,
  '2025-05-31 23:59:59'
),
-- مهمة DeFi Protocol
(
  'انضم إلى قناة DeFi المتخصصة',
  'تعلم عن التمويل اللامركزي وأحدث البروتوكولات',
  65,
  'https://t.me/defiprotocol',
  'DeFi Protocol',
  null,
  'partner',
  true,
  7000,
  '2025-04-15 23:59:59'
),
-- مهمة NFT Community
(
  'انضم إلى مجتمع NFT العربي',
  'اكتشف عالم الرموز غير القابلة للاستبدال وتداولها',
  45,
  'https://t.me/nftarabic',
  'NFT Community',
  null,
  'partner',
  true,
  9000,
  '2025-03-10 23:59:59'
);

-- إضافة إشعارات للمستخدمين عن المهام الجديدة
-- (سيتم تشغيلها تلقائياً عبر trigger الموجود)