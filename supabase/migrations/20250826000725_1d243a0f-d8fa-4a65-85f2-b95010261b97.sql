-- إضافة عمود مدة الكامبين وتحديث الكامبينات الحالية لتكون 10 أيام
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE;

-- تحديث الكامبينات الحالية لتنتهي بعد 10 أيام من تاريخ البداية
UPDATE public.campaigns 
SET ends_at = COALESCE(starts_at, created_at) + INTERVAL '10 days'
WHERE ends_at IS NULL;

-- تحديث نظام المشاركة في الكامبينات - إضافة trigger لتحديث عدد المشاركين
CREATE OR REPLACE FUNCTION public.update_campaign_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  -- تحديث عدد المشاركين في الكامبين
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء الـ trigger إذا لم يكن موجوداً
DROP TRIGGER IF EXISTS campaign_participant_count_trigger ON public.campaign_participants;
CREATE TRIGGER campaign_participant_count_trigger
  AFTER INSERT ON public.campaign_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_participants_count();

-- دالة لخصم السيولة من الحساب عند إنشاء كامبين
CREATE OR REPLACE FUNCTION public.deduct_campaign_liquidity()
RETURNS TRIGGER AS $$
BEGIN
  -- خصم السيولة من رصيد المنشئ
  IF NEW.payment_type = 'pepe' THEN
    UPDATE public.telegram_users 
    SET pepe_advertising_balance = pepe_advertising_balance - NEW.liquidity_amount
    WHERE telegram_id = NEW.creator_telegram_id;
  ELSIF NEW.payment_type = 'ton' THEN
    UPDATE public.telegram_users 
    SET ton_balance = ton_balance - NEW.liquidity_amount
    WHERE telegram_id = NEW.creator_telegram_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء الـ trigger لخصم السيولة
DROP TRIGGER IF EXISTS deduct_liquidity_trigger ON public.campaigns;
CREATE TRIGGER deduct_liquidity_trigger
  AFTER INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_campaign_liquidity();