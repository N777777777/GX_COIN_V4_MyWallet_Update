-- Add mandatory channel subscription field to lucky_draws table
ALTER TABLE public.lucky_draws 
ADD COLUMN mandatory_channel_username TEXT,
ADD COLUMN mandatory_channel_id BIGINT,
ADD COLUMN require_channel_subscription BOOLEAN DEFAULT FALSE;