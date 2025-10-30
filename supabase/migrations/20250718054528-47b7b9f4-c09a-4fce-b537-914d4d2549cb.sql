-- Create table for storing user data from Telegram
CREATE TABLE public.telegram_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT,
  is_bot BOOLEAN DEFAULT FALSE,
  coins BIGINT DEFAULT 0,
  energy INTEGER DEFAULT 1000,
  energy_limit INTEGER DEFAULT 1000,
  coins_per_tap INTEGER DEFAULT 1,
  energy_recharge_rate INTEGER DEFAULT 1,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

-- Create policies for telegram users
CREATE POLICY "Enable read access for all users" ON public.telegram_users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON public.telegram_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON public.telegram_users
  FOR UPDATE USING (true);

-- Create tasks table
CREATE TABLE public.user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID REFERENCES public.telegram_users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  task_data JSONB,
  completed BOOLEAN DEFAULT FALSE,
  reward_claimed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for tasks
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable access for all users" ON public.user_tasks
  FOR ALL USING (true);

-- Create referrals table
CREATE TABLE public.user_referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_telegram_id BIGINT REFERENCES public.telegram_users(telegram_id),
  referred_telegram_id BIGINT REFERENCES public.telegram_users(telegram_id),
  reward_amount INTEGER DEFAULT 1000,
  reward_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for referrals
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable access for all users" ON public.user_referrals
  FOR ALL USING (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_telegram_users_updated_at
  BEFORE UPDATE ON public.telegram_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_telegram_users_telegram_id ON public.telegram_users(telegram_id);
CREATE INDEX idx_user_tasks_telegram_user_id ON public.user_tasks(telegram_user_id);
CREATE INDEX idx_user_referrals_referrer ON public.user_referrals(referrer_telegram_id);
CREATE INDEX idx_user_referrals_referred ON public.user_referrals(referred_telegram_id);