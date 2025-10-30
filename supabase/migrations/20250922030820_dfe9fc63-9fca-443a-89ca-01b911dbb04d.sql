-- إنشاء جدول مكافآت OfferWall
CREATE TABLE public.offerwall_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reward_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  project_id TEXT,
  amount NUMERIC NOT NULL DEFAULT 10,
  original_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تمكين RLS
ALTER TABLE public.offerwall_rewards ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view their own offerwall rewards" 
ON public.offerwall_rewards 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_sessions s
    WHERE s.telegram_user_id = offerwall_rewards.user_id
    AND COALESCE(s.is_active, true) = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND s.session_token = get_request_header('x-session-token')
  )
);

CREATE POLICY "Service role can manage offerwall rewards" 
ON public.offerwall_rewards 
FOR ALL 
USING (auth.role() = 'service_role');

-- إنشاء فهارس للبحث السريع
CREATE INDEX idx_offerwall_rewards_reward_id ON public.offerwall_rewards(reward_id);
CREATE INDEX idx_offerwall_rewards_user_telegram_id ON public.offerwall_rewards(user_telegram_id);
CREATE INDEX idx_offerwall_rewards_created_at ON public.offerwall_rewards(created_at);

-- إنشاء trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION public.update_offerwall_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_offerwall_rewards_updated_at
BEFORE UPDATE ON public.offerwall_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_offerwall_rewards_updated_at();