-- إنشاء جدول لتسجيل محاولات الوصول المشبوهة
CREATE TABLE public.security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID REFERENCES public.telegram_users(id) ON DELETE CASCADE,
  telegram_id BIGINT,
  ip_address INET,
  user_agent TEXT,
  session_token TEXT,
  access_source TEXT NOT NULL, -- 'telegram_webapp', 'direct_url', 'vpn_suspected'
  security_flags TEXT[], -- array of security concerns
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fingerprint_hash TEXT, -- browser/device fingerprint
  is_blocked BOOLEAN DEFAULT false
);

-- إنشاء جدول لحفظ جلسات المستخدمين النشطة
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID REFERENCES public.telegram_users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours')
);

-- إضافة عمود للتحقق من صحة المستخدم
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_source TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspicious_activity_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- إنشاء indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_security_logs_telegram_id ON public.security_logs(telegram_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON public.security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_sessions_telegram_id ON public.user_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);

-- تمكين Row Level Security
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Service role can manage security logs" 
ON public.security_logs 
FOR ALL 
TO service_role
USING (true);

CREATE POLICY "Service role can manage user sessions" 
ON public.user_sessions 
FOR ALL 
TO service_role
USING (true);

-- دالة للتحقق من صحة الجلسة
CREATE OR REPLACE FUNCTION public.validate_user_session(
  telegram_id_param BIGINT,
  session_token_param TEXT,
  ip_address_param INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  session_record RECORD;
  user_record RECORD;
  is_valid BOOLEAN := false;
  security_flags TEXT[] := '{}';
  result JSON;
BEGIN
  -- البحث عن الجلسة
  SELECT * INTO session_record 
  FROM public.user_sessions 
  WHERE telegram_id = telegram_id_param 
  AND session_token = session_token_param
  AND is_active = true
  AND expires_at > NOW();
  
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = telegram_id_param;
  
  IF user_record IS NULL THEN
    security_flags := security_flags || 'USER_NOT_FOUND';
  ELSIF user_record.is_blocked THEN
    security_flags := security_flags || 'USER_BLOCKED';
  ELSIF session_record IS NULL THEN
    security_flags := security_flags || 'INVALID_SESSION';
  ELSE
    -- التحقق من تغيير IP المشبوه
    IF session_record.ip_address IS NOT NULL AND ip_address_param IS NOT NULL 
       AND session_record.ip_address != ip_address_param THEN
      security_flags := security_flags || 'IP_CHANGED';
    END IF;
    
    -- التحقق من تغيير User Agent
    IF session_record.user_agent IS NOT NULL AND user_agent_param IS NOT NULL 
       AND session_record.user_agent != user_agent_param THEN
      security_flags := security_flags || 'USER_AGENT_CHANGED';
    END IF;
    
    -- إذا لم توجد مشاكل أمنية كبيرة
    IF NOT ('USER_BLOCKED' = ANY(security_flags)) AND NOT ('INVALID_SESSION' = ANY(security_flags)) THEN
      is_valid := true;
      
      -- تحديث آخر نشاط
      UPDATE public.user_sessions 
      SET last_activity = NOW(),
          ip_address = COALESCE(ip_address_param, ip_address),
          user_agent = COALESCE(user_agent_param, user_agent)
      WHERE id = session_record.id;
    END IF;
  END IF;
  
  -- تسجيل محاولة الوصول
  INSERT INTO public.security_logs (
    telegram_user_id,
    telegram_id,
    ip_address,
    user_agent,
    session_token,
    access_source,
    security_flags
  ) VALUES (
    user_record.id,
    telegram_id_param,
    ip_address_param,
    user_agent_param,
    session_token_param,
    CASE 
      WHEN array_length(security_flags, 1) > 0 THEN 'suspicious_access'
      ELSE 'normal_access'
    END,
    security_flags
  );
  
  -- بناء النتيجة
  result := json_build_object(
    'is_valid', is_valid,
    'security_flags', security_flags,
    'user_blocked', COALESCE(user_record.is_blocked, false),
    'session_expires_at', session_record.expires_at,
    'verification_required', NOT COALESCE(user_record.is_verified, false)
  );
  
  RETURN result;
END;
$$;

-- دالة لإنشاء جلسة آمنة
CREATE OR REPLACE FUNCTION public.create_secure_session(
  telegram_id_param BIGINT,
  device_fingerprint_param TEXT,
  ip_address_param INET DEFAULT NULL,
  user_agent_param TEXT DEFAULT NULL,
  verification_source_param TEXT DEFAULT 'telegram_webapp'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  session_token TEXT;
  new_session_id UUID;
  result JSON;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = telegram_id_param;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  IF user_record.is_blocked THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم محظور'
    );
  END IF;
  
  -- إنشاء رمز جلسة آمن
  session_token := encode(gen_random_bytes(32), 'hex');
  
  -- إلغاء الجلسات السابقة
  UPDATE public.user_sessions 
  SET is_active = false 
  WHERE telegram_id = telegram_id_param AND is_active = true;
  
  -- إنشاء جلسة جديدة
  INSERT INTO public.user_sessions (
    telegram_user_id,
    telegram_id,
    session_token,
    device_fingerprint,
    ip_address,
    user_agent
  ) VALUES (
    user_record.id,
    telegram_id_param,
    session_token,
    device_fingerprint_param,
    ip_address_param,
    user_agent_param
  ) RETURNING id INTO new_session_id;
  
  -- تحديث حالة التحقق للمستخدم
  UPDATE public.telegram_users 
  SET is_verified = true,
      verification_source = verification_source_param,
      last_verification_at = NOW()
  WHERE telegram_id = telegram_id_param;
  
  result := json_build_object(
    'success', true,
    'session_token', session_token,
    'session_id', new_session_id,
    'expires_at', (NOW() + INTERVAL '24 hours')
  );
  
  RETURN result;
END;
$$;