-- إنشاء جدول الكامبين
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  creator_telegram_id BIGINT NOT NULL,
  campaign_name TEXT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('pepe', 'ton')),
  liquidity_amount NUMERIC NOT NULL,
  campaign_image_url TEXT NOT NULL,
  channel_username TEXT NOT NULL,
  channel_id BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  total_participants INTEGER DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  distribution_completed BOOLEAN DEFAULT FALSE
);

-- إنشاء جدول مشاركات الكامبين
CREATE TABLE public.campaign_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_telegram_id BIGINT NOT NULL,
  participation_type TEXT NOT NULL CHECK (participation_type IN ('direct', 'referral')),
  referrer_id UUID,
  referrer_telegram_id BIGINT,
  binance_id TEXT, -- للPEPE
  ton_wallet_address TEXT, -- للTON
  reward_amount NUMERIC DEFAULT 0,
  reward_distributed BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_channel_membership BOOLEAN DEFAULT FALSE
);

-- إنشاء فهارس
CREATE INDEX idx_campaigns_creator ON public.campaigns(creator_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaign_participants_campaign ON public.campaign_participants(campaign_id);
CREATE INDEX idx_campaign_participants_user ON public.campaign_participants(user_id);
CREATE INDEX idx_campaign_participants_referrer ON public.campaign_participants(referrer_id);

-- تمكين RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للكامبين
CREATE POLICY "Anyone can view active campaigns" 
ON public.campaigns 
FOR SELECT 
USING (status IN ('active', 'completed'));

CREATE POLICY "Users can create campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Creators can update their campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (creator_id IN (SELECT id FROM public.telegram_users WHERE telegram_id::text = auth.uid()::text));

-- سياسات RLS لمشاركات الكامبين
CREATE POLICY "Anyone can view campaign participants" 
ON public.campaign_participants 
FOR SELECT 
USING (true);

CREATE POLICY "Users can participate in campaigns" 
ON public.campaign_participants 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their participation" 
ON public.campaign_participants 
FOR UPDATE 
USING (user_id IN (SELECT id FROM public.telegram_users WHERE telegram_id::text = auth.uid()::text));

-- إنشاء trigger لتحديث عدد المشاركين
CREATE OR REPLACE FUNCTION update_campaign_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.campaigns 
  SET 
    total_participants = (
      SELECT COUNT(*) FROM public.campaign_participants 
      WHERE campaign_id = NEW.campaign_id AND participation_type = 'direct'
    ),
    total_referrals = (
      SELECT COUNT(*) FROM public.campaign_participants 
      WHERE campaign_id = NEW.campaign_id AND participation_type = 'referral'
    )
  WHERE id = NEW.campaign_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_counts
AFTER INSERT ON public.campaign_participants
FOR EACH ROW
EXECUTE FUNCTION update_campaign_participants_count();