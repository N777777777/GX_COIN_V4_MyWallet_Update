-- Create daily_logins table to track daily check-ins
CREATE TABLE public.daily_logins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID NOT NULL,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward_amount DECIMAL(5,2) NOT NULL DEFAULT 0.3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(telegram_user_id, login_date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_logins
CREATE POLICY "Users can view their own daily logins" 
ON public.daily_logins 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own daily logins" 
ON public.daily_logins 
FOR INSERT 
WITH CHECK (true);

-- Create function to handle daily login and reward
CREATE OR REPLACE FUNCTION public.handle_daily_login(user_telegram_id UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;