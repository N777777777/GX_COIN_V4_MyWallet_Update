-- Create function to announce campaign when status changes to completed
CREATE OR REPLACE FUNCTION public.announce_completed_campaign()
RETURNS TRIGGER AS $$
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
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || 
                   current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when campaign status changes
DROP TRIGGER IF EXISTS announce_campaign_completion ON public.campaigns;
CREATE TRIGGER announce_campaign_completion
  AFTER UPDATE OF status ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.announce_completed_campaign();