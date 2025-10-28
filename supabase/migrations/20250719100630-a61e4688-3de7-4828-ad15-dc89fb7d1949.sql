-- أولاً: تصحيح نوع البيانات للنقاط - يجب أن تكون أرقام صحيحة وليس عشرية
-- تغيير عمود coins إلى numeric بدلاً من bigint للسماح بالقيم العشرية
ALTER TABLE public.telegram_users 
ALTER COLUMN coins TYPE numeric(10,1) USING coins::numeric(10,1);

-- إنشاء جدول للمهام الافتراضية إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.default_tasks (
  id SERIAL PRIMARY KEY,
  task_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward_amount INTEGER NOT NULL DEFAULT 10,
  task_type TEXT NOT NULL DEFAULT 'payment',
  requirements JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- تمكين RLS إذا لم يكن مُمكناً
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c 
    JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE c.relname = 'default_tasks' AND n.nspname = 'public' AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE public.default_tasks ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- إضافة مهمة دفع 1 تون
INSERT INTO public.default_tasks (task_id, title, description, reward_amount, task_type, requirements)
VALUES (
  'ton_payment_1',
  'دفع 1 TON',
  'قم بدفع 1 TON واحصل على 10 عملات ذهبية',
  10,
  'ton_payment',
  '{"amount": 1, "currency": "TON", "description": "Payment of 1 TON for 10 coins"}'::jsonb
)
ON CONFLICT (task_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_amount = EXCLUDED.reward_amount,
  requirements = EXCLUDED.requirements,
  updated_at = now();

-- إضافة مهام أخرى إضافية
INSERT INTO public.default_tasks (task_id, title, description, reward_amount, task_type, requirements)
VALUES 
  (
    'kucoin_register',
    'التسجيل في KuCoin',
    'سجل في منصة KuCoin واحصل على 25 عملة',
    25,
    'platform',
    '{"platform": "KuCoin", "action": "register"}'::jsonb
  ),
  (
    'referral_5_friends',
    'ادع 5 أصدقاء',
    'ادع 5 أصدقاء للانضمام واحصل على 50 عملة',
    50,
    'referral',
    '{"required_referrals": 5}'::jsonb
  ),
  (
    'daily_check_7_days',
    'تسجيل دخول يومي لمدة 7 أيام',
    'سجل دخولك يومياً لمدة 7 أيام متتالية',
    30,
    'daily',
    '{"consecutive_days": 7}'::jsonb
  )
ON CONFLICT (task_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  reward_amount = EXCLUDED.reward_amount,
  requirements = EXCLUDED.requirements,
  updated_at = now();