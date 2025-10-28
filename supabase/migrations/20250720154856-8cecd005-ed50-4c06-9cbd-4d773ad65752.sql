-- إضافة مهام جديدة متنوعة
INSERT INTO public.default_tasks (task_id, title, description, task_type, reward_amount, requirements, is_active) VALUES
-- مهام اجتماعية إضافية
('follow_twitter', 'تابع حسابنا على تويتر', 'تابع الحساب الرسمي للحصول على آخر الأخبار', 'social', 2, '{"action": "follow", "platform": "twitter", "url": "https://twitter.com/example", "required": true}', true),

('join_discord', 'انضم لخادم Discord', 'انضم لمجتمع Discord الخاص بنا', 'social', 3, '{"action": "join", "platform": "discord", "url": "https://discord.gg/example", "required": true}', true),

('youtube_subscribe', 'اشترك في قناة YouTube', 'اشترك في قناتنا على يوتيوب', 'social', 2, '{"action": "subscribe", "platform": "youtube", "url": "https://youtube.com/@example", "required": true}', true),

('instagram_follow', 'تابع Instagram', 'تابع حسابنا على انستجرام', 'social', 2, '{"action": "follow", "platform": "instagram", "url": "https://instagram.com/example", "required": true}', true),

-- مهام منصات إضافية
('binance_campaign', 'مهمة Binance', 'شارك في كامبين Binance الخاص', 'platform', 15, '{"action": "participate", "platform": "Binance", "campaign_link": "https://www.binance.com/activity", "required": true}', true),

('bybit_task', 'مهمة ByBit', 'أكمل مهام ByBit للحصول على مكافآت', 'platform', 12, '{"action": "participate", "platform": "ByBit", "campaign_link": "https://www.bybit.com/promo", "required": true}', true),

('okx_challenge', 'تحدي OKX', 'شارك في تحدي OKX اليومي', 'platform', 8, '{"action": "participate", "platform": "OKX", "campaign_link": "https://www.okx.com/activity", "required": true}', true),

('gate_io_task', 'مهمة Gate.io', 'أكمل مهام Gate.io المتقدمة', 'platform', 10, '{"action": "participate", "platform": "Gate.io", "campaign_link": "https://www.gate.io/campaign", "required": true}', true),

('huobi_mission', 'مهمة Huobi', 'شارك في مهام Huobi العالمية', 'platform', 14, '{"action": "participate", "platform": "Huobi", "campaign_link": "https://www.huobi.com/activity", "required": true}', true),

-- مهام يومية وإنجازات
('daily_check_in', 'تسجيل دخول يومي', 'سجل دخولك اليومي لمدة 7 أيام', 'daily', 1, '{"action": "check_in", "streak_required": 1, "required": true}', true),

('invite_friends', 'ادع 5 أصدقاء', 'ادع 5 أصدقاء للحصول على مكافأة ضخمة', 'achievement', 25, '{"action": "referral", "count_required": 5, "required": true}', true),

('tap_1000_times', 'انقر 1000 مرة', 'اجمع 1000 نقطة من النقر', 'achievement', 5, '{"action": "tap", "count_required": 1000, "required": true}', true),

('reach_level_10', 'اوصل للمستوى 10', 'اوصل للمستوى 10 في اللعبة', 'achievement', 20, '{"action": "level_up", "level_required": 10, "required": true}', true),

-- مهام خاصة
('ton_wallet_connect', 'ربط محفظة TON', 'اربط محفظة TON الخاصة بك', 'special', 10, '{"action": "connect_wallet", "platform": "TON", "required": true}', true),

('complete_profile', 'أكمل ملفك الشخصي', 'أضف صورة واسم للملف الشخصي', 'special', 3, '{"action": "complete_profile", "required": true}', true);