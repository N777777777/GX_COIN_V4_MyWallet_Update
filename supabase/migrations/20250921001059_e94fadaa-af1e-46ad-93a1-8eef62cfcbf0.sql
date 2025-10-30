-- إنشاء جدول للتحقق من المستخدمين ومنع الحسابات المتعددة
CREATE TABLE IF NOT EXISTS public.user_verification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id UUID REFERENCES public.telegram_users(id),
  telegram_id BIGINT NOT NULL,
  user_hash TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  vpn_detected BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX idx_user_verification_telegram_id ON public.user_verification(telegram_id);
CREATE INDEX idx_user_verification_user_hash ON public.user_verification(user_hash);
CREATE INDEX idx_user_verification_is_banned ON public.user_verification(is_banned);

-- تمكين Row Level Security
ALTER TABLE public.user_verification ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الأمان
CREATE POLICY "Allow read access to verification data" 
ON public.user_verification 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert verification data" 
ON public.user_verification 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update verification data" 
ON public.user_verification 
FOR UPDATE 
USING (true);

-- إضافة عمود التحقق في جدول المستخدمين إذا لم يكن موجوداً
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_required BOOLEAN DEFAULT true;

-- دالة للتحقق من حالة المستخدم
CREATE OR REPLACE FUNCTION public.check_user_verification_status(p_telegram_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
  verification_record RECORD;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = p_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود',
      'requires_verification', true
    );
  END IF;
  
  -- البحث عن حالة التحقق
  SELECT * INTO verification_record
  FROM public.user_verification
  WHERE telegram_id = p_telegram_id;
  
  IF verification_record IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'verified', false,
      'banned', false,
      'requires_verification', true,
      'message', 'يتطلب تحقق من الكابتشا'
    );
  END IF;
  
  IF verification_record.is_banned THEN
    RETURN json_build_object(
      'success', true,
      'verified', false,
      'banned', true,
      'ban_reason', verification_record.ban_reason,
      'message', 'المستخدم محظور: ' || COALESCE(verification_record.ban_reason, 'سبب غير محدد')
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'verified', verification_record.is_verified,
    'banned', false,
    'requires_verification', NOT verification_record.is_verified,
    'message', CASE 
      WHEN verification_record.is_verified THEN 'المستخدم محقق'
      ELSE 'يتطلب تحقق من الكابتشا'
    END
  );
END;
$function$;

-- دالة لمعالجة التحقق من webhook
CREATE OR REPLACE FUNCTION public.process_verification_webhook(
  p_telegram_id BIGINT,
  p_user_hash TEXT,
  p_captcha_status TEXT,
  p_vpn_detected TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
  existing_hash_record RECORD;
  verification_record RECORD;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = p_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- التحقق من التحقق المسبق
  SELECT * INTO verification_record
  FROM public.user_verification
  WHERE telegram_id = p_telegram_id;
  
  IF verification_record IS NOT NULL AND verification_record.is_verified THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم محقق مسبقاً'
    );
  END IF;
  
  -- التحقق من VPN
  IF p_vpn_detected = 'yes' THEN
    -- إدراج أو تحديث سجل التحقق
    INSERT INTO public.user_verification (
      telegram_user_id,
      telegram_id,
      user_hash,
      is_verified,
      is_banned,
      ban_reason,
      vpn_detected
    ) VALUES (
      user_record.id,
      p_telegram_id,
      p_user_hash,
      false,
      true,
      'استخدام VPN محظور',
      true
    )
    ON CONFLICT (user_hash) 
    DO UPDATE SET
      is_banned = true,
      ban_reason = 'استخدام VPN محظور',
      vpn_detected = true,
      updated_at = now();
    
    RETURN json_build_object(
      'success', false,
      'banned', true,
      'message', '🚨 تم حظرك لاستخدام VPN!'
    );
  END IF;
  
  -- التحقق من وجود user_hash مستخدم مسبقاً
  SELECT * INTO existing_hash_record
  FROM public.user_verification
  WHERE user_hash = p_user_hash AND telegram_id != p_telegram_id;
  
  IF existing_hash_record IS NOT NULL THEN
    -- حظر المستخدم لاستخدام حساب متعدد
    INSERT INTO public.user_verification (
      telegram_user_id,
      telegram_id,
      user_hash,
      is_verified,
      is_banned,
      ban_reason
    ) VALUES (
      user_record.id,
      p_telegram_id,
      p_user_hash || '_duplicate',
      false,
      true,
      'استخدام حسابات متعددة محظور'
    )
    ON CONFLICT (user_hash) 
    DO UPDATE SET
      is_banned = true,
      ban_reason = 'استخدام حسابات متعددة محظور',
      updated_at = now();
    
    RETURN json_build_object(
      'success', false,
      'banned', true,
      'message', '❌ تم حظرك لاستخدام حسابات متعددة'
    );
  END IF;
  
  -- التحقق من الكابتشا
  IF p_captcha_status = 'ok' THEN
    -- تحديث أو إدراج سجل التحقق الناجح
    INSERT INTO public.user_verification (
      telegram_user_id,
      telegram_id,
      user_hash,
      is_verified,
      is_banned,
      verification_date
    ) VALUES (
      user_record.id,
      p_telegram_id,
      p_user_hash,
      true,
      false,
      now()
    )
    ON CONFLICT (user_hash) 
    DO UPDATE SET
      is_verified = true,
      is_banned = false,
      verification_date = now(),
      updated_at = now();
    
    -- تحديث جدول المستخدمين
    UPDATE public.telegram_users 
    SET 
      is_verified = true,
      verification_required = false
    WHERE telegram_id = p_telegram_id;
    
    RETURN json_build_object(
      'success', true,
      'verified', true,
      'message', '✅ تم التحقق بنجاح'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'فشل في التحقق من الكابتشا'
    );
  END IF;
END;
$function$;