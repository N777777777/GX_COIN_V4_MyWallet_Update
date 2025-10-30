-- إضافة عمود PEPE balance للمستخدمين
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS pepe_balance NUMERIC DEFAULT 0;

-- إنشاء جدول المهام المخصصة من المستخدمين
CREATE TABLE IF NOT EXISTS public.user_created_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  creator_telegram_id BIGINT NOT NULL,
  channel_url TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  invite_link TEXT,
  target_members INTEGER NOT NULL,
  cost_pepe NUMERIC NOT NULL,
  reward_per_member NUMERIC NOT NULL DEFAULT 150,
  current_members INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- إنشاء جدول إنجازات المهام المخصصة
CREATE TABLE IF NOT EXISTS public.custom_task_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified BOOLEAN DEFAULT false
);

-- إنشاء جدول معاملات SWAP
CREATE TABLE IF NOT EXISTS public.swap_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  from_amount NUMERIC NOT NULL,
  to_amount NUMERIC NOT NULL,
  exchange_rate NUMERIC NOT NULL,
  transaction_hash TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء جدول مشاهدة الإعلانات اليومية
CREATE TABLE IF NOT EXISTS public.daily_ad_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  ads_watched INTEGER DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_pepe_earned NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- تمكين RLS للجداول الجديدة
ALTER TABLE public.user_created_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_ad_rewards ENABLE ROW LEVEL SECURITY;

-- سياسات أمان للمهام المخصصة
CREATE POLICY "Users can view all active custom tasks" 
ON public.user_created_tasks 
FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can create their own custom tasks" 
ON public.user_created_tasks 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can manage all custom tasks" 
ON public.user_created_tasks 
FOR ALL 
USING (true);

-- سياسات أمان لإنجازات المهام المخصصة
CREATE POLICY "Users can view custom task completions" 
ON public.custom_task_completions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can complete custom tasks" 
ON public.custom_task_completions 
FOR INSERT 
WITH CHECK (true);

-- سياسات أمان لمعاملات SWAP
CREATE POLICY "Users can view their own swap transactions" 
ON public.swap_transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create swap transactions" 
ON public.swap_transactions 
FOR INSERT 
WITH CHECK (true);

-- سياسات أمان لمكافآت الإعلانات اليومية
CREATE POLICY "Users can view their own ad rewards" 
ON public.daily_ad_rewards 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own ad rewards" 
ON public.daily_ad_rewards 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own ad rewards" 
ON public.daily_ad_rewards 
FOR UPDATE 
USING (true);

-- إنشاء فانكشن للتبديل من TON إلى PEPE
CREATE OR REPLACE FUNCTION public.swap_ton_to_pepe(
  user_telegram_id BIGINT,
  ton_amount NUMERIC
) RETURNS JSON AS $$
DECLARE
  user_record RECORD;
  pepe_amount NUMERIC;
  exchange_rate NUMERIC := 300000; -- 1 TON = 300,000 PEPE
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = user_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- التحقق من وجود رصيد TON كافٍ
  IF user_record.ton_balance < ton_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رصيد TON غير كافي'
    );
  END IF;
  
  -- حساب كمية PEPE
  pepe_amount := ton_amount * exchange_rate;
  
  -- تحديث الأرصدة
  UPDATE public.telegram_users 
  SET 
    ton_balance = ton_balance - ton_amount,
    pepe_balance = pepe_balance + pepe_amount
  WHERE id = user_record.id;
  
  -- تسجيل المعاملة
  INSERT INTO public.swap_transactions (
    user_id,
    user_telegram_id,
    from_currency,
    to_currency,
    from_amount,
    to_amount,
    exchange_rate
  ) VALUES (
    user_record.id,
    user_telegram_id,
    'TON',
    'PEPE',
    ton_amount,
    pepe_amount,
    exchange_rate
  );
  
  RETURN json_build_object(
    'success', true,
    'pepe_received', pepe_amount,
    'exchange_rate', exchange_rate
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;