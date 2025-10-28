-- Drop the previous custom_referral_rates table as it's not needed
DROP TABLE IF EXISTS public.custom_referral_rates CASCADE;

-- Create a simple global settings table for referral commission
CREATE TABLE IF NOT EXISTS public.referral_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gcoin_v4_commission NUMERIC(10,6) DEFAULT 0.1,
  description TEXT DEFAULT 'Global G COIN V4 referral commission',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by TEXT DEFAULT 'admin'
);

-- Enable RLS
ALTER TABLE public.referral_commission_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Anyone can read, only service role can write
CREATE POLICY "Anyone can view referral commission settings"
ON public.referral_commission_settings
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage referral commission settings"
ON public.referral_commission_settings
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Insert default value
INSERT INTO public.referral_commission_settings (gcoin_v4_commission, description)
VALUES (0.1, 'Default G COIN V4 referral commission - 0.1 per referral')
ON CONFLICT DO NOTHING;

-- Function to update the global commission rate
CREATE OR REPLACE FUNCTION public.update_referral_commission(
  p_new_commission NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_commission NUMERIC;
BEGIN
  -- Validate commission (must be between 0 and 10)
  IF p_new_commission < 0 OR p_new_commission > 10 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Commission must be between 0 and 10 G COIN'
    );
  END IF;
  
  -- Get old commission
  SELECT gcoin_v4_commission INTO v_old_commission
  FROM referral_commission_settings
  LIMIT 1;
  
  -- Update commission
  UPDATE referral_commission_settings
  SET 
    gcoin_v4_commission = p_new_commission,
    updated_at = now(),
    description = 'G COIN V4 referral commission updated to ' || p_new_commission
  WHERE id = (SELECT id FROM referral_commission_settings LIMIT 1);
  
  RETURN json_build_object(
    'success', true,
    'message', 'Referral commission updated successfully',
    'old_commission', v_old_commission,
    'new_commission', p_new_commission
  );
END;
$$;

-- Function to get current commission rate
CREATE OR REPLACE FUNCTION public.get_referral_commission()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission NUMERIC;
BEGIN
  SELECT gcoin_v4_commission INTO v_commission
  FROM referral_commission_settings
  LIMIT 1;
  
  RETURN COALESCE(v_commission, 0.1);
END;
$$;

-- Add comment
COMMENT ON TABLE public.referral_commission_settings IS 'Global settings for G COIN V4 referral commission';
COMMENT ON COLUMN public.referral_commission_settings.gcoin_v4_commission IS 'G COIN V4 amount given for each referral (default 0.1)';