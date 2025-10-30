-- أولاً: تصحيح نوع البيانات للنقاط - يجب أن تكون أرقام صحيحة وليس عشرية
-- تغيير عمود coins إلى numeric بدلاً من bigint للسماح بالقيم العشرية
ALTER TABLE public.telegram_users 
ALTER COLUMN coins TYPE numeric(10,1) USING coins::numeric(10,1);

-- تحديث دالة التسجيل اليومي لتعمل مع numeric
CREATE OR REPLACE FUNCTION public.handle_daily_login(user_telegram_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  existing_login RECORD;
  new_login RECORD;
  result JSON;
BEGIN
  -- Check if user already logged in today
  SELECT * INTO existing_login 
  FROM public.daily_logins 
  WHERE telegram_user_id = user_telegram_id 
  AND login_date = CURRENT_DATE;
  
  IF existing_login IS NOT NULL THEN
    -- User already logged in today
    result := json_build_object(
      'success', false,
      'message', 'Already logged in today',
      'already_claimed', true,
      'next_claim', (CURRENT_DATE + INTERVAL '1 day')::date
    );
  ELSE
    -- Create new daily login record
    INSERT INTO public.daily_logins (telegram_user_id, login_date, reward_amount)
    VALUES (user_telegram_id, CURRENT_DATE, 0.3)
    RETURNING * INTO new_login;
    
    -- Add coins to user (0.3 coins)
    UPDATE public.telegram_users 
    SET coins = coins + 0.3
    WHERE id = user_telegram_id;
    
    result := json_build_object(
      'success', true,
      'message', 'Daily login successful',
      'reward_amount', 0.3,
      'next_claim', (CURRENT_DATE + INTERVAL '1 day')::date
    );
  END IF;
  
  RETURN result;
END;
$function$;

-- إضافة مهمة دفع 1 تون لربح 10 عملات
-- إنشاء جدول للمهام الافتراضية
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

-- تمكين RLS
ALTER TABLE public.default_tasks ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسة للقراءة للجميع
CREATE POLICY "Anyone can view default tasks" 
ON public.default_tasks 
FOR SELECT 
USING (is_active = true);

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

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE TRIGGER update_default_tasks_updated_at
    BEFORE UPDATE ON public.default_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();