-- Create missing security_violations table
CREATE TABLE public.security_violations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id uuid REFERENCES public.telegram_users(id),
  telegram_id bigint,
  violation_type text NOT NULL,
  violation_details jsonb,
  ip_address inet,
  user_agent text,
  session_token text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolver_notes text
);

-- Enable RLS
ALTER TABLE public.security_violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Service role can manage security violations" 
ON public.security_violations 
FOR ALL 
TO service_role 
USING (true);

-- Create index for better performance
CREATE INDEX idx_security_violations_telegram_id ON public.security_violations(telegram_id);
CREATE INDEX idx_security_violations_created_at ON public.security_violations(created_at);
CREATE INDEX idx_security_violations_violation_type ON public.security_violations(violation_type);