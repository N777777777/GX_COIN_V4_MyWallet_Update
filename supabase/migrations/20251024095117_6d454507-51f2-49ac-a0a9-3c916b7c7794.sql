-- Create table for custom referral commission rates per user
CREATE TABLE IF NOT EXISTS public.custom_referral_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id UUID NOT NULL REFERENCES telegram_users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  
  -- Commission rates for different balance types
  pepe_rate NUMERIC(5,4) DEFAULT 0.35, -- Default 35%
  alpha_rate NUMERIC(5,4) DEFAULT 0.03, -- Default 3%
  gcoin_v4_rate NUMERIC(5,4) DEFAULT 0.05, -- Default 5%
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by TEXT DEFAULT 'admin',
  
  UNIQUE(telegram_user_id)
);

-- Enable RLS
ALTER TABLE public.custom_referral_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage custom rates"
ON public.custom_referral_rates
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Users can view their own custom rates"
ON public.custom_referral_rates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_sessions s
    WHERE s.telegram_user_id = custom_referral_rates.telegram_user_id
    AND COALESCE(s.is_active, true) = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND s.session_token = get_request_header('x-session-token')
  )
);

-- Create indexes for better performance
CREATE INDEX idx_custom_referral_rates_telegram_id ON public.custom_referral_rates(telegram_id);
CREATE INDEX idx_custom_referral_rates_active ON public.custom_referral_rates(is_active) WHERE is_active = true;

-- Function to set custom referral rate for a user
CREATE OR REPLACE FUNCTION public.set_custom_referral_rate(
  p_telegram_id BIGINT,
  p_pepe_rate NUMERIC DEFAULT NULL,
  p_alpha_rate NUMERIC DEFAULT NULL,
  p_gcoin_v4_rate NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_result JSON;
BEGIN
  -- Get user record
  SELECT * INTO v_user_record
  FROM telegram_users
  WHERE telegram_id = p_telegram_id;
  
  IF v_user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Validate rates (must be between 0 and 1)
  IF p_pepe_rate IS NOT NULL AND (p_pepe_rate < 0 OR p_pepe_rate > 1) THEN
    RETURN json_build_object('success', false, 'message', 'PEPE rate must be between 0 and 1');
  END IF;
  
  IF p_alpha_rate IS NOT NULL AND (p_alpha_rate < 0 OR p_alpha_rate > 1) THEN
    RETURN json_build_object('success', false, 'message', 'Alpha rate must be between 0 and 1');
  END IF;
  
  IF p_gcoin_v4_rate IS NOT NULL AND (p_gcoin_v4_rate < 0 OR p_gcoin_v4_rate > 1) THEN
    RETURN json_build_object('success', false, 'message', 'G COIN V4 rate must be between 0 and 1');
  END IF;
  
  -- Insert or update custom rates
  INSERT INTO custom_referral_rates (
    telegram_user_id,
    telegram_id,
    pepe_rate,
    alpha_rate,
    gcoin_v4_rate,
    notes,
    is_active
  ) VALUES (
    v_user_record.id,
    p_telegram_id,
    COALESCE(p_pepe_rate, 0.35),
    COALESCE(p_alpha_rate, 0.03),
    COALESCE(p_gcoin_v4_rate, 0.05),
    p_notes,
    true
  )
  ON CONFLICT (telegram_user_id) 
  DO UPDATE SET
    pepe_rate = COALESCE(p_pepe_rate, custom_referral_rates.pepe_rate),
    alpha_rate = COALESCE(p_alpha_rate, custom_referral_rates.alpha_rate),
    gcoin_v4_rate = COALESCE(p_gcoin_v4_rate, custom_referral_rates.gcoin_v4_rate),
    notes = COALESCE(p_notes, custom_referral_rates.notes),
    is_active = true,
    updated_at = now();
  
  RETURN json_build_object(
    'success', true,
    'message', 'Custom referral rates set successfully',
    'rates', json_build_object(
      'pepe_rate', COALESCE(p_pepe_rate, 0.35),
      'alpha_rate', COALESCE(p_alpha_rate, 0.03),
      'gcoin_v4_rate', COALESCE(p_gcoin_v4_rate, 0.05)
    )
  );
END;
$$;

-- Function to get custom referral rate for a user
CREATE OR REPLACE FUNCTION public.get_custom_referral_rate(p_telegram_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rates RECORD;
BEGIN
  SELECT * INTO v_rates
  FROM custom_referral_rates
  WHERE telegram_id = p_telegram_id
  AND is_active = true;
  
  IF v_rates IS NULL THEN
    -- Return default rates
    RETURN json_build_object(
      'success', true,
      'has_custom_rate', false,
      'pepe_rate', 0.35,
      'alpha_rate', 0.03,
      'gcoin_v4_rate', 0.05
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'has_custom_rate', true,
    'pepe_rate', v_rates.pepe_rate,
    'alpha_rate', v_rates.alpha_rate,
    'gcoin_v4_rate', v_rates.gcoin_v4_rate,
    'notes', v_rates.notes,
    'created_at', v_rates.created_at,
    'updated_at', v_rates.updated_at
  );
END;
$$;

-- Function to remove custom referral rate (revert to default)
CREATE OR REPLACE FUNCTION public.remove_custom_referral_rate(p_telegram_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE custom_referral_rates
  SET is_active = false,
      updated_at = now()
  WHERE telegram_id = p_telegram_id;
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Custom rate removed, reverted to default rates'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'No custom rate found for this user'
    );
  END IF;
END;
$$;

-- Function to list all users with custom rates
CREATE OR REPLACE FUNCTION public.list_custom_referral_rates()
RETURNS TABLE(
  telegram_id BIGINT,
  first_name TEXT,
  username TEXT,
  pepe_rate NUMERIC,
  alpha_rate NUMERIC,
  gcoin_v4_rate NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    crr.telegram_id,
    tu.first_name,
    tu.username,
    crr.pepe_rate,
    crr.alpha_rate,
    crr.gcoin_v4_rate,
    crr.notes,
    crr.created_at,
    crr.updated_at
  FROM custom_referral_rates crr
  JOIN telegram_users tu ON crr.telegram_user_id = tu.id
  WHERE crr.is_active = true
  ORDER BY crr.updated_at DESC;
END;
$$;

-- Add comments
COMMENT ON TABLE public.custom_referral_rates IS 'Stores custom referral commission rates for specific users';
COMMENT ON COLUMN public.custom_referral_rates.pepe_rate IS 'Custom PEPE commission rate (0-1, e.g., 0.15 = 15%)';
COMMENT ON COLUMN public.custom_referral_rates.alpha_rate IS 'Custom Alpha commission rate (0-1, e.g., 0.03 = 3%)';
COMMENT ON COLUMN public.custom_referral_rates.gcoin_v4_rate IS 'Custom G COIN V4 commission rate (0-1, e.g., 0.05 = 5%)';