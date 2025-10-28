-- إنشاء جدول لتخزين معاملات TimeWall
CREATE TABLE public.timewall_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  revenue NUMERIC NOT NULL,
  currency_amount NUMERIC NOT NULL,
  transaction_type TEXT NOT NULL,
  withdrawal_id TEXT,
  user_ip INET,
  hash_received TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء فهرس للبحث السريع
CREATE INDEX idx_timewall_transactions_user_id ON public.timewall_transactions(user_id);
CREATE INDEX idx_timewall_transactions_transaction_id ON public.timewall_transactions(transaction_id);

-- تفعيل RLS
ALTER TABLE public.timewall_transactions ENABLE ROW LEVEL SECURITY;

-- سياسة للخدمة
CREATE POLICY "Service role can manage timewall transactions" ON public.timewall_transactions
FOR ALL USING (true) WITH CHECK (true);

-- سياسة للمستخدمين لرؤية معاملاتهم فقط
CREATE POLICY "Users can view their own timewall transactions" ON public.timewall_transactions
FOR SELECT USING (true);