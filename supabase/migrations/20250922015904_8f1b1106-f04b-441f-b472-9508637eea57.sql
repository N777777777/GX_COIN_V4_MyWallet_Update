-- Create premium_purchases table for tracking premium membership purchases
CREATE TABLE public.premium_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id BIGINT NOT NULL,
  payment_amount NUMERIC NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'alpha_coins',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_purchases ENABLE ROW LEVEL SECURITY;

-- Block all unauthorized access first
CREATE POLICY "Block unauthorized access to premium purchases" 
ON public.premium_purchases 
FOR ALL 
TO public
USING (false) 
WITH CHECK (false);

-- Allow users to view only their own premium purchases with session validation
CREATE POLICY "Users can view only their own premium purchases" 
ON public.premium_purchases 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM public.user_sessions s 
        WHERE s.telegram_user_id IN (
          SELECT id FROM public.telegram_users WHERE telegram_id = premium_purchases.telegram_user_id
        )
        AND COALESCE(s.is_active, true) = true 
        AND (s.expires_at IS NULL OR s.expires_at > now()) 
        AND s.session_token = public.get_request_header('x-session-token')
    )
);

-- Allow service role full access for admin operations
CREATE POLICY "Service role can manage all premium purchases" 
ON public.premium_purchases 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Add is_premium column to telegram_users if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'telegram_users' 
                  AND column_name = 'is_premium' 
                  AND table_schema = 'public') THEN
        ALTER TABLE public.telegram_users ADD COLUMN is_premium BOOLEAN DEFAULT false;
    END IF;
END $$;