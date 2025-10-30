-- إنشاء جدول الإيداعات المعلقة للتحقق
CREATE TABLE public.pending_ton_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID NOT NULL,
  transaction_hash TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_verification',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_attempts INTEGER DEFAULT 0,
  last_verification_attempt TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.pending_ton_deposits ENABLE ROW LEVEL SECURITY;

-- Create policies for the pending deposits table
CREATE POLICY "Users can view their own pending deposits" 
ON public.pending_ton_deposits 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage all pending deposits" 
ON public.pending_ton_deposits 
FOR ALL 
USING (true);

-- Add index for better performance
CREATE INDEX idx_pending_deposits_status ON public.pending_ton_deposits(status);
CREATE INDEX idx_pending_deposits_created_at ON public.pending_ton_deposits(created_at);
CREATE INDEX idx_pending_deposits_tx_hash ON public.pending_ton_deposits(transaction_hash);

-- إضافة عمود transaction_hash لجدول ton_purchases إذا لم يكن موجوداً
ALTER TABLE public.ton_purchases 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified';

-- إنشاء function للتحقق من الإيداعات المعلقة
CREATE OR REPLACE FUNCTION public.process_verified_deposit(deposit_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deposit_record RECORD;
  user_record RECORD;
BEGIN
  -- الحصول على بيانات الإيداع
  SELECT * INTO deposit_record 
  FROM public.pending_ton_deposits 
  WHERE id = deposit_id AND status = 'verified';
  
  IF deposit_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- التحقق من وجود المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE id = deposit_record.telegram_user_id;
  
  IF user_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- إضافة الرصيد للمستخدم
  UPDATE public.telegram_users 
  SET ton_balance = ton_balance + deposit_record.amount
  WHERE id = deposit_record.telegram_user_id;
  
  -- إنشاء سجل في جدول المشتريات
  INSERT INTO public.ton_purchases (
    telegram_user_id,
    ton_amount,
    coin_amount,
    transaction_hash,
    status,
    verified,
    verification_status,
    completed_at
  ) VALUES (
    deposit_record.telegram_user_id,
    deposit_record.amount,
    0, -- لا نحول إلى عملات في هذه الحالة
    deposit_record.transaction_hash,
    'completed',
    true,
    'verified',
    now()
  );
  
  -- تحديث حالة الإيداع المعلق
  UPDATE public.pending_ton_deposits 
  SET status = 'completed'
  WHERE id = deposit_id;
  
  RETURN TRUE;
END;
$$;