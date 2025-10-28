-- Create PEPE withdrawal requests table
CREATE TABLE public.pepe_withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID NOT NULL,
  telegram_id BIGINT NOT NULL,
  pepe_amount NUMERIC NOT NULL,
  binance_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT
);

-- Enable RLS
ALTER TABLE public.pepe_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own PEPE withdrawal requests" 
ON public.pepe_withdrawal_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own PEPE withdrawal requests" 
ON public.pepe_withdrawal_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage all PEPE withdrawal requests" 
ON public.pepe_withdrawal_requests 
FOR ALL 
USING (true);