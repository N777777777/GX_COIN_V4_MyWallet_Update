-- Create partnership_requests table
CREATE TABLE IF NOT EXISTS public.partnership_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id UUID NOT NULL REFERENCES public.telegram_users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  username TEXT NOT NULL,
  channel_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.telegram_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.partnership_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own partnership requests"
ON public.partnership_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = partnership_requests.telegram_user_id
    AND COALESCE(s.is_active, true) = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND s.session_token = public.get_request_header('x-session-token')
  )
);

-- Users can create their own requests
CREATE POLICY "Users can create partnership requests"
ON public.partnership_requests
FOR INSERT
WITH CHECK (true);

-- Service role can manage all requests
CREATE POLICY "Service role can manage partnership requests"
ON public.partnership_requests
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_partnership_requests_telegram_user_id ON public.partnership_requests(telegram_user_id);
CREATE INDEX idx_partnership_requests_status ON public.partnership_requests(status);

-- Add trigger to automatically add to manager_referral_commission_rates when approved
CREATE OR REPLACE FUNCTION public.handle_partnership_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When status changes to approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Insert or update manager commission rates
    INSERT INTO public.manager_referral_commission_rates (
      manager_telegram_id,
      pepe_commission_rate,
      alpha_commission_rate,
      gcoin_v4_commission_rate,
      is_active
    ) VALUES (
      NEW.telegram_id,
      0.60,
      0.06,
      0.10,
      true
    )
    ON CONFLICT (manager_telegram_id) 
    DO UPDATE SET
      pepe_commission_rate = 0.60,
      alpha_commission_rate = 0.06,
      gcoin_v4_commission_rate = 0.10,
      is_active = true,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_partnership_approval
  AFTER UPDATE ON public.partnership_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_partnership_approval();