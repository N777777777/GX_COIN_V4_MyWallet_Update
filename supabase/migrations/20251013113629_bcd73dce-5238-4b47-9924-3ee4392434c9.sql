-- حذف كل الـ triggers والـ functions المتعلقة بـ campaign announcement
DROP TRIGGER IF EXISTS on_campaign_completed ON public.campaigns CASCADE;
DROP TRIGGER IF EXISTS announce_campaign_completion ON public.campaigns CASCADE;
DROP FUNCTION IF EXISTS public.announce_completed_campaign() CASCADE;

-- إعادة إنشاء الـ function بشكل صحيح
CREATE OR REPLACE FUNCTION public.announce_completed_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  campaign_data RECORD;
BEGIN
  -- Check if status changed from pending to completed
  IF OLD.status = 'pending' AND NEW.status = 'completed' THEN
    -- Get the full campaign data
    SELECT * INTO campaign_data FROM public.campaigns WHERE id = NEW.id;
    
    -- Call the edge function to announce the campaign
    PERFORM
      net.http_post(
        url := 'https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/announce-campaign',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'campaign', json_build_object(
            'id', campaign_data.id,
            'campaign_name', campaign_data.campaign_name,
            'liquidity_amount', campaign_data.liquidity_amount,
            'payment_type', campaign_data.payment_type,
            'channel_username', campaign_data.channel_username
          )
        )::jsonb
      );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- إعادة إنشاء الـ trigger
CREATE TRIGGER on_campaign_completed
  AFTER UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.announce_completed_campaign();