-- Create function to notify referrer when they receive rewards
CREATE OR REPLACE FUNCTION notify_referrer_on_reward()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_tg_id BIGINT;
  referred_user_name TEXT;
  supabase_url TEXT := 'https://yyjxkogzsqiekbawwhgf.supabase.co';
BEGIN
  -- Get referrer telegram_id
  SELECT telegram_id INTO referrer_tg_id
  FROM telegram_users
  WHERE telegram_id = NEW.referrer_telegram_id;
  
  -- Get referred user name
  SELECT COALESCE(first_name, username, 'صديقك') INTO referred_user_name
  FROM telegram_users
  WHERE telegram_id = NEW.referred_telegram_id;
  
  -- Call edge function to send notification (asynchronously)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/notify-referrer-reward',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'referrer_telegram_id', referrer_tg_id,
      'referred_user_name', referred_user_name,
      'gcoin_reward', NEW.gcoin_reward,
      'pepe_reward', NEW.pepe_reward,
      'alpha_reward', NEW.alpha_reward
    )
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE WARNING 'Failed to send referrer notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on referral_earnings insert
DROP TRIGGER IF EXISTS on_referral_reward_given ON referral_earnings;
CREATE TRIGGER on_referral_reward_given
  AFTER INSERT ON referral_earnings
  FOR EACH ROW
  EXECUTE FUNCTION notify_referrer_on_reward();
