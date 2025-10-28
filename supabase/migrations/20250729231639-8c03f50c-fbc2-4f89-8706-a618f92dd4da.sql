-- إنشاء جدول دفعات النجوم
CREATE TABLE public.star_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  telegram_charge_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.star_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own payments" 
ON public.star_payments 
FOR SELECT 
USING (telegram_user_id = (
  SELECT telegram_id FROM public.telegram_users 
  WHERE id = auth.uid()
));

-- Add updated_at trigger
CREATE TRIGGER update_star_payments_updated_at
BEFORE UPDATE ON public.star_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();