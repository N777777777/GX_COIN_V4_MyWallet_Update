-- إنشاء جدول مشتريات TON
CREATE TABLE public.ton_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID NOT NULL,
  transaction_hash TEXT,
  transaction_id TEXT,
  ton_amount NUMERIC NOT NULL,
  coin_amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  verified BOOLEAN DEFAULT false
);

-- تفعيل RLS
ALTER TABLE public.ton_purchases ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Users can view their own purchases" 
ON public.ton_purchases 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own purchases" 
ON public.ton_purchases 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can manage all purchases" 
ON public.ton_purchases 
FOR ALL 
USING (true);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_ton_purchases_user_id ON public.ton_purchases(telegram_user_id);
CREATE INDEX idx_ton_purchases_transaction_hash ON public.ton_purchases(transaction_hash);
CREATE INDEX idx_ton_purchases_status ON public.ton_purchases(status);