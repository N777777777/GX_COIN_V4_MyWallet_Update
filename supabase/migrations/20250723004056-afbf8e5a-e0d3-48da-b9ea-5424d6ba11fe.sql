-- إضافة الأعمدة المطلوبة لجدول المستخدمين إذا لم تكن موجودة
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_source TEXT DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspicious_activity_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

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