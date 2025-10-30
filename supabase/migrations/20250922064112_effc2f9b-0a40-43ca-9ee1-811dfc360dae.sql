-- إضافة عمود المكافآت المستلمة للمشاركين في الحملات
ALTER TABLE public.campaign_participants 
ADD COLUMN IF NOT EXISTS reward_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reward_distributed BOOLEAN DEFAULT false;

-- وظيفة توزيع مكافآت الحملة عند انتهائها
CREATE OR REPLACE FUNCTION public.distribute_campaign_rewards(campaign_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_record RECORD;
  total_participants INTEGER;
  reward_per_participant NUMERIC;
  participant_record RECORD;
  result JSON;
BEGIN
  -- الحصول على بيانات الحملة
  SELECT * INTO campaign_record 
  FROM public.campaigns 
  WHERE id = campaign_id_param;
  
  IF campaign_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الحملة غير موجودة'
    );
  END IF;
  
  -- التحقق من أن الحملة لم يتم توزيع مكافآتها بعد
  IF campaign_record.distribution_completed = true THEN
    RETURN json_build_object(
      'success', false,
      'message', 'تم توزيع مكافآت هذه الحملة مسبقاً'
    );
  END IF;
  
  -- عد المشاركين في الحملة
  SELECT COUNT(*) INTO total_participants
  FROM public.campaign_participants 
  WHERE campaign_id = campaign_id_param;
  
  IF total_participants = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا يوجد مشاركين في هذه الحملة'
    );
  END IF;
  
  -- حساب المكافأة لكل مشارك
  reward_per_participant := campaign_record.liquidity_amount / total_participants;
  
  -- توزيع المكافآت على جميع المشاركين
  FOR participant_record IN 
    SELECT cp.*, tu.telegram_id
    FROM public.campaign_participants cp
    JOIN public.telegram_users tu ON cp.user_id = tu.id
    WHERE cp.campaign_id = campaign_id_param
  LOOP
    -- إضافة المكافأة لرصيد المشارك
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance + reward_per_participant
    WHERE id = participant_record.user_id;
    
    -- تحديث سجل المشارك
    UPDATE public.campaign_participants 
    SET 
      reward_amount = reward_per_participant,
      reward_distributed = true
    WHERE id = participant_record.id;
  END LOOP;
  
  -- تحديث حالة الحملة لتوضيح أن التوزيع تم
  UPDATE public.campaigns 
  SET 
    distribution_completed = true,
    status = 'completed'
  WHERE id = campaign_id_param;
  
  RETURN json_build_object(
    'success', true,
    'campaign_id', campaign_id_param,
    'total_participants', total_participants,
    'reward_per_participant', reward_per_participant,
    'total_distributed', campaign_record.liquidity_amount,
    'message', 'تم توزيع المكافآت بنجاح'
  );
END;
$$;

-- وظيفة للتحقق من الحملات المنتهية وتوزيع مكافآتها تلقائياً
CREATE OR REPLACE FUNCTION public.auto_distribute_expired_campaigns()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  campaign_record RECORD;
  distribution_result JSON;
  results JSON[] := '{}';
  total_processed INTEGER := 0;
BEGIN
  -- العثور على جميع الحملات المنتهية والتي لم يتم توزيع مكافآتها
  FOR campaign_record IN 
    SELECT * FROM public.campaigns 
    WHERE status = 'active' 
    AND ends_at <= NOW()
    AND distribution_completed = false
  LOOP
    -- توزيع مكافآت الحملة
    SELECT public.distribute_campaign_rewards(campaign_record.id) INTO distribution_result;
    
    -- إضافة النتيجة للمصفوفة
    results := results || distribution_result;
    total_processed := total_processed + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'total_campaigns_processed', total_processed,
    'results', results
  );
END;
$$;

-- إضافة trigger لتوزيع الإحالات عند المشاركة في الحملات
CREATE OR REPLACE FUNCTION public.process_campaign_referral_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_reward NUMERIC := 0.1; -- مكافأة الإحالة 0.1 TON
BEGIN
  -- التحقق من وجود إحالة
  IF NEW.referrer_id IS NOT NULL THEN
    -- إضافة مكافأة الإحالة للمُحيل
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance + referrer_reward
    WHERE id = NEW.referrer_id;
    
    -- تسجيل مكافأة الإحالة
    INSERT INTO public.referral_rewards (
      referrer_id,
      referred_id,
      campaign_id,
      reward_amount,
      reward_type
    ) VALUES (
      NEW.referrer_id,
      NEW.user_id,
      NEW.campaign_id,
      referrer_reward,
      'campaign_referral'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء جدول لتسجيل مكافآت الإحالات
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  campaign_id UUID,
  reward_amount NUMERIC NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL DEFAULT 'campaign_referral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id, campaign_id)
);

-- تمكين RLS على جدول مكافآت الإحالات
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- سياسة للسماح للخدمة بإدارة مكافآت الإحالات
CREATE POLICY "Service role can manage referral rewards"
ON public.referral_rewards FOR ALL
USING (auth.role() = 'service_role');

-- سياسة للسماح للمستخدمين بعرض مكافآت إحالاتهم
CREATE POLICY "Users can view their referral rewards"
ON public.referral_rewards FOR SELECT
USING (
  referrer_id IN (
    SELECT id FROM public.telegram_users 
    WHERE telegram_id::text = auth.uid()::text
  )
);

-- إنشاء trigger لمعالجة الإحالات عند المشاركة
DROP TRIGGER IF EXISTS campaign_referral_trigger ON public.campaign_participants;
CREATE TRIGGER campaign_referral_trigger
  AFTER INSERT ON public.campaign_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.process_campaign_referral_rewards();