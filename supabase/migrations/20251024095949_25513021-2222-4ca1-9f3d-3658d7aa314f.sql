-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view user commissions" ON public.user_referral_commissions;
DROP POLICY IF EXISTS "Service role can manage user commissions" ON public.user_referral_commissions;

-- Create table for user-specific referral commissions
CREATE TABLE IF NOT EXISTS public.user_referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id UUID NOT NULL REFERENCES public.telegram_users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL UNIQUE,
  gcoin_v4_commission NUMERIC(10,6) NOT NULL DEFAULT 0.1,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view user commissions"
ON public.user_referral_commissions
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage user commissions"
ON public.user_referral_commissions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_referral_commissions_telegram_id 
ON public.user_referral_commissions(telegram_id);

-- Function to set commission for a specific user by telegram_id
CREATE OR REPLACE FUNCTION public.set_user_referral_commission(
  p_telegram_id BIGINT,
  p_commission NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_old_commission NUMERIC;
BEGIN
  -- Validate commission (must be between 0 and 10)
  IF p_commission < 0 OR p_commission > 10 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يجب أن تكون العمولة بين 0 و 10 G COIN'
    );
  END IF;
  
  -- Get user record
  SELECT * INTO v_user_record
  FROM telegram_users
  WHERE telegram_id = p_telegram_id;
  
  IF v_user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- Check if user already has a custom commission
  SELECT gcoin_v4_commission INTO v_old_commission
  FROM user_referral_commissions
  WHERE telegram_id = p_telegram_id;
  
  -- Insert or update user commission
  INSERT INTO user_referral_commissions (
    telegram_user_id,
    telegram_id,
    gcoin_v4_commission,
    description
  ) VALUES (
    v_user_record.id,
    p_telegram_id,
    p_commission,
    'عمولة مخصصة لـ ' || COALESCE(v_user_record.first_name, 'مستخدم') || ' - ' || p_commission || ' G COIN'
  )
  ON CONFLICT (telegram_id) 
  DO UPDATE SET
    gcoin_v4_commission = p_commission,
    description = 'عمولة مخصصة لـ ' || COALESCE(v_user_record.first_name, 'مستخدم') || ' - ' || p_commission || ' G COIN',
    updated_at = now(),
    is_active = true;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم تحديث عمولة المستخدم بنجاح',
    'telegram_id', p_telegram_id,
    'user_name', v_user_record.first_name,
    'old_commission', v_old_commission,
    'new_commission', p_commission
  );
END;
$$;

-- Function to get commission for a specific user (falls back to global if not set)
CREATE OR REPLACE FUNCTION public.get_user_referral_commission(
  p_telegram_id BIGINT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_commission NUMERIC;
  v_global_commission NUMERIC;
BEGIN
  -- Try to get user-specific commission
  SELECT gcoin_v4_commission INTO v_user_commission
  FROM user_referral_commissions
  WHERE telegram_id = p_telegram_id
  AND is_active = true;
  
  -- If user has custom commission, return it
  IF v_user_commission IS NOT NULL THEN
    RETURN v_user_commission;
  END IF;
  
  -- Otherwise, return global commission
  SELECT gcoin_v4_commission INTO v_global_commission
  FROM referral_commission_settings
  LIMIT 1;
  
  RETURN COALESCE(v_global_commission, 0.1);
END;
$$;

-- Function to remove user-specific commission (revert to global)
CREATE OR REPLACE FUNCTION public.remove_user_referral_commission(
  p_telegram_id BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_referral_commissions
  SET is_active = false,
      updated_at = now()
  WHERE telegram_id = p_telegram_id;
  
  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'message', 'تم إلغاء العمولة المخصصة، سيستخدم المستخدم العمولة العالمية الآن'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'لا توجد عمولة مخصصة لهذا المستخدم'
    );
  END IF;
END;
$$;

-- Function to list all users with custom commissions
CREATE OR REPLACE FUNCTION public.list_custom_commissions()
RETURNS TABLE(
  telegram_id BIGINT,
  first_name TEXT,
  username TEXT,
  commission NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    urc.telegram_id,
    tu.first_name,
    tu.username,
    urc.gcoin_v4_commission,
    urc.description,
    urc.created_at
  FROM user_referral_commissions urc
  JOIN telegram_users tu ON urc.telegram_user_id = tu.id
  WHERE urc.is_active = true
  ORDER BY urc.created_at DESC;
END;
$$;