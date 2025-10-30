-- إنشاء جدول للعقود المنشورة
CREATE TABLE public.deployed_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_telegram_id BIGINT NOT NULL,
  creator_user_id UUID REFERENCES public.telegram_users(id),
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_supply NUMERIC NOT NULL,
  token_description TEXT,
  contract_address TEXT,
  deployment_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'deployed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deployed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_deployed_tokens_creator ON public.deployed_tokens(creator_telegram_id);
CREATE INDEX idx_deployed_tokens_status ON public.deployed_tokens(status);
CREATE INDEX idx_deployed_tokens_symbol ON public.deployed_tokens(token_symbol);

-- تمكين RLS
ALTER TABLE public.deployed_tokens ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view all deployed tokens" 
ON public.deployed_tokens 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own tokens" 
ON public.deployed_tokens 
FOR INSERT 
WITH CHECK (creator_telegram_id IN (
  SELECT telegram_id FROM public.telegram_users WHERE auth.uid() = id
));

CREATE POLICY "Users can update their own tokens" 
ON public.deployed_tokens 
FOR UPDATE 
USING (creator_telegram_id IN (
  SELECT telegram_id FROM public.telegram_users WHERE auth.uid() = id
));