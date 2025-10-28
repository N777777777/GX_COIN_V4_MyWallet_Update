-- Fix the announce_completed_campaign function to handle JSON properly
CREATE OR REPLACE FUNCTION public.announce_completed_campaign()
RETURNS TRIGGER AS $$
DECLARE
  campaign_data RECORD;
  bot_token TEXT;
BEGIN
  -- Check if status changed from pending to completed
  IF OLD.status = 'pending' AND NEW.status = 'completed' THEN
    -- Get the bot token from environment (this will be available in the edge function)
    -- For now, we'll pass the campaign data without trying to access secrets here
    
    -- Get the full campaign data
    SELECT * INTO campaign_data FROM public.campaigns WHERE id = NEW.id;
    
    -- Call the edge function to announce the campaign
    -- Use a simpler approach without trying to access service role key from trigger
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
$$ LANGUAGE plpgsql SECURITY DEFINER;