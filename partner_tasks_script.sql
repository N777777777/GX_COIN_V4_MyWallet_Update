-- سكربت إضافة مهام الشركاء
-- يمكن تشغيله في SQL Editor مباشرة

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

-- مهام منصات التداول الرئيسية
(
  'انضم إلى قناة Binance العربية',
  'تابع آخر الأخبار والتحديثات من منصة Binance الرائدة عالمياً',
  100,
  'https://t.me/binancearabic',
  'Binance',
  'https://bin.bnbstatic.com/static/images/common/favicon.ico',
  'partner',
  true,
  15000,
  '2025-03-31 23:59:59'
),

(
  'اشترك في قناة KuCoin الرسمية',
  'احصل على تحديثات منصة KuCoin وآخر العروض والميزات',
  85,
  'https://t.me/kucoinexchange',
  'KuCoin',
  'https://kucoin.com/favicon.ico',
  'partner',
  true,
  10000,
  '2025-04-15 23:59:59'
),

(
  'تابع قناة Gate.io',
  'انضم إلى مجتمع Gate.io واحصل على معلومات حصرية',
  70,
  'https://t.me/gateio',
  'Gate.io',
  'https://www.gate.io/favicon.ico',
  'partner',
  true,
  8000,
  '2025-04-30 23:59:59'
),

-- مهام المحافظ الرقمية
(
  'انضم إلى MetaMask Community',
  'تعلم كيفية استخدام محفظة MetaMask بأمان وفعالية',
  90,
  'https://t.me/metamask_community',
  'MetaMask',
  'https://metamask.io/favicon.ico',
  'partner',
  true,
  12000,
  '2025-05-15 23:59:59'
),

(
  'تابع Ledger Support',
  'احصل على دعم فني ونصائح أمان لمحافظ Ledger الباردة',
  75,
  'https://t.me/ledgersupport',
  'Ledger',
  'https://www.ledger.com/favicon.ico',
  'partner',
  true,
  7000,
  '2025-04-20 23:59:59'
),

-- مهام الأخبار والتحليلات
(
  'اشترك في CoinDesk Arabic',
  'تابع أهم الأخبار والتحليلات في عالم العملات المشفرة',
  50,
  'https://t.me/coindeskArabic',
  'CoinDesk',
  'https://www.coindesk.com/favicon.ico',
  'partner',
  true,
  20000,
  '2025-06-30 23:59:59'
),

(
  'انضم إلى Cointelegraph عربي',
  'احصل على تحديثات يومية من أكبر موقع أخبار العملات المشفرة',
  60,
  'https://t.me/cointelegrapharabic',
  'Cointelegraph',
  'https://cointelegraph.com/favicon.ico',
  'partner',
  true,
  18000,
  '2025-05-31 23:59:59'
),

-- مهام البلوك تشين والتقنية
(
  'تابع Ethereum Foundation',
  'تعلم عن تطورات شبكة الإيثيريوم والتقنيات الجديدة',
  120,
  'https://t.me/ethereumfoundation',
  'Ethereum Foundation',
  'https://ethereum.org/favicon.ico',
  'partner',
  true,
  10000,
  '2025-05-01 23:59:59'
),

(
  'انضم إلى Polygon Community',
  'اكتشف حلول التوسع والتطبيقات اللامركزية على Polygon',
  95,
  'https://t.me/polygoncommunity',
  'Polygon',
  'https://polygon.technology/favicon.ico',
  'partner',
  true,
  9000,
  '2025-04-25 23:59:59'
),

-- مهام DeFi والتمويل اللامركزي
(
  'اشترك في Uniswap Protocol',
  'تعلم عن تداول العملات اللامركزي ومنصة Uniswap',
  110,
  'https://t.me/uniswapprotocol',
  'Uniswap',
  'https://app.uniswap.org/favicon.ico',
  'partner',
  true,
  8000,
  '2025-04-18 23:59:59'
),

(
  'تابع PancakeSwap Arabic',
  'انضم إلى مجتمع PancakeSwap العربي وتعلم عن التداول على BSC',
  80,
  'https://t.me/pancakeswapArabic',
  'PancakeSwap',
  'https://pancakeswap.finance/favicon.ico',
  'partner',
  true,
  11000,
  '2025-04-22 23:59:59'
),

-- مهام التعليم والتدريب
(
  'انضم إلى Crypto Academy',
  'تعلم أساسيات العملات المشفرة والتداول مع الخبراء',
  65,
  'https://t.me/cryptoacademy',
  'Crypto Academy',
  null,
  'partner',
  true,
  25000,
  '2025-07-31 23:59:59'
),

(
  'تابع Blockchain Education',
  'احصل على كورسات مجانية في تقنية البلوك تشين',
  55,
  'https://t.me/blockchaineducation',
  'Blockchain Education',
  null,
  'partner',
  true,
  22000,
  '2025-06-15 23:59:59'
),

-- مهام المشاريع الناشئة
(
  'اكتشف Solana Ecosystem',
  'تعرف على النظام البيئي لشبكة Solana والمشاريع المبنية عليها',
  105,
  'https://t.me/solanaecosystem',
  'Solana',
  'https://solana.com/favicon.ico',
  'partner',
  true,
  7500,
  '2025-04-28 23:59:59'
),

(
  'انضم إلى Avalanche Community',
  'اكتشف شبكة Avalanche وحلولها السريعة للتطبيقات اللامركزية',
  90,
  'https://t.me/avalanchecommunity',
  'Avalanche',
  'https://www.avax.network/favicon.ico',
  'partner',
  true,
  6500,
  '2025-04-12 23:59:59'
),

-- مهام التحليل الفني
(
  'تابع TradingView العربي',
  'احصل على إشارات وتحليلات فنية احترافية للعملات المشفرة',
  70,
  'https://t.me/tradingviewarabic',
  'TradingView',
  'https://www.tradingview.com/favicon.ico',
  'partner',
  true,
  16000,
  '2025-05-20 23:59:59'
),

-- مهام الألعاب والـ NFT
(
  'اكتشف OpenSea Community',
  'تعلم عن تداول NFTs في أكبر سوق للرموز غير القابلة للاستبدال',
  85,
  'https://t.me/openseacommunity',
  'OpenSea',
  'https://opensea.io/favicon.ico',
  'partner',
  true,
  12000,
  '2025-05-10 23:59:59'
),

(
  'انضم إلى GameFi Arabia',
  'اكتشف عالم الألعاب المبنية على البلوك تشين والربح من اللعب',
  75,
  'https://t.me/gamefiarabia',
  'GameFi Arabia',
  null,
  'partner',
  true,
  14000,
  '2025-05-25 23:59:59'
),

-- مهام التقنيات الناشئة
(
  'تابع Web3 Foundation',
  'تعلم عن مستقبل الإنترنت اللامركزي وتقنيات Web3',
  100,
  'https://t.me/web3foundation',
  'Web3 Foundation',
  'https://web3.foundation/favicon.ico',
  'partner',
  true,
  9000,
  '2025-05-05 23:59:59'
),

(
  'اكتشف Metaverse Hub',
  'انضم إلى مجتمع الميتافيرس واكتشف العوالم الافتراضية الجديدة',
  95,
  'https://t.me/metaversehub',
  'Metaverse Hub',
  null,
  'partner',
  true,
  11000,
  '2025-05-18 23:59:59'
);

-- تحديث عداد المشاركين (اختياري)
UPDATE public.partner_tasks 
SET current_participants = 0 
WHERE current_participants IS NULL;

-- إضافة فهرس لتحسين الأداء (اختياري)
CREATE INDEX IF NOT EXISTS idx_partner_tasks_active 
ON public.partner_tasks(is_active, end_date) 
WHERE is_active = true;

-- عرض المهام المضافة
SELECT 
  title,
  partner_name,
  reward_amount,
  max_participants,
  end_date,
  is_active
FROM public.partner_tasks 
WHERE is_active = true 
ORDER BY reward_amount DESC;