-- إنشاء دالة معالجة التحقق من الكابتشا مع نظام منع التعدد المحسّن
CREATE OR REPLACE FUNCTION public.process_verification_webhook(
  p_telegram_id bigint,
  p_user_hash text,
  p_captcha_status boolean,
  p_vpn_detected boolean
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  user_record RECORD;
  verification_record RECORD;
  duplicate_accounts INTEGER := 0;
  suspicious_activity BOOLEAN := FALSE;
  ban_reason TEXT := '';
  device_fingerprint TEXT;
  ip_address TEXT;
BEGIN
  -- الحصول على بيانات المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = p_telegram_id;
  
  -- إنشاء بصمة الجهاز من user_hash
  device_fingerprint := substring(p_user_hash, 1, 32);
  ip_address := substring(p_user_hash, 33);
  
  -- فشل في الكابتشا
  IF NOT p_captcha_status THEN
    RETURN json_build_object(
      'success', false,
      'verified', false,
      'banned', false,
      'message', 'فشل في التحقق من الكابتشا. حاول مرة أخرى.',
      'reason', 'captcha_failed'
    );
  END IF;
  
  -- كشف VPN/Proxy
  IF p_vpn_detected THEN
    suspicious_activity := TRUE;
    ban_reason := ban_reason || 'استخدام VPN/Proxy محظور. ';
  END IF;
  
  -- فحص التعدد بناءً على user_hash/device fingerprint
  SELECT COUNT(*) INTO duplicate_accounts
  FROM public.user_verification 
  WHERE user_hash = p_user_hash 
  AND telegram_id != p_telegram_id
  AND is_verified = true
  AND NOT is_banned;
  
  -- فحص تعدد الحسابات بناءً على بصمة الجهاز
  IF duplicate_accounts = 0 THEN
    SELECT COUNT(*) INTO duplicate_accounts
    FROM public.user_verification 
    WHERE device_fingerprint = device_fingerprint
    AND telegram_id != p_telegram_id
    AND is_verified = true
    AND NOT is_banned;
  END IF;
  
  -- تحديد النشاط المشبوه والحظر
  IF duplicate_accounts > 0 THEN
    suspicious_activity := TRUE;
    ban_reason := ban_reason || 'تم اكتشاف حسابات متعددة من نفس الجهاز. ';
  END IF;
  
  -- فحص أنماط السلوك المشبوه إضافية
  -- فحص التحقق السريع المتتالي (خلال دقيقة واحدة)
  IF EXISTS (
    SELECT 1 FROM public.user_verification 
    WHERE device_fingerprint = device_fingerprint
    AND created_at > NOW() - INTERVAL '1 minute'
    AND telegram_id != p_telegram_id
  ) THEN
    suspicious_activity := TRUE;
    ban_reason := ban_reason || 'محاولات تحقق سريعة متتالية مشبوهة. ';
  END IF;
  
  -- تسجيل أو تحديث سجل التحقق
  INSERT INTO public.user_verification (
    telegram_id,
    user_hash,
    device_fingerprint,
    ip_address,
    captcha_passed,
    vpn_detected,
    is_verified,
    is_banned,
    ban_reason,
    verification_attempts,
    last_verification_at
  ) VALUES (
    p_telegram_id,
    p_user_hash,
    device_fingerprint,
    ip_address,
    p_captcha_status,
    p_vpn_detected,
    NOT suspicious_activity,
    suspicious_activity,
    CASE WHEN suspicious_activity THEN ban_reason ELSE NULL END,
    1,
    NOW()
  )
  ON CONFLICT (telegram_id) DO UPDATE SET
    user_hash = EXCLUDED.user_hash,
    device_fingerprint = EXCLUDED.device_fingerprint,
    ip_address = EXCLUDED.ip_address,
    captcha_passed = EXCLUDED.captcha_passed,
    vpn_detected = EXCLUDED.vpn_detected,
    is_verified = CASE 
      WHEN user_verification.is_banned THEN FALSE 
      ELSE NOT suspicious_activity 
    END,
    is_banned = CASE 
      WHEN user_verification.is_banned THEN TRUE 
      ELSE suspicious_activity 
    END,
    ban_reason = CASE 
      WHEN suspicious_activity THEN ban_reason
      WHEN user_verification.is_banned THEN user_verification.ban_reason
      ELSE NULL 
    END,
    verification_attempts = user_verification.verification_attempts + 1,
    last_verification_at = NOW(),
    updated_at = NOW();
  
  -- إذا تم اكتشاف نشاط مشبوه، حظر جميع الحسابات المرتبطة
  IF suspicious_activity THEN
    -- حظر الحسابات الأخرى بنفس user_hash
    UPDATE public.user_verification 
    SET is_banned = true,
        ban_reason = 'مرتبط بحساب محظور - ' || ban_reason,
        updated_at = NOW()
    WHERE user_hash = p_user_hash 
    AND telegram_id != p_telegram_id;
    
    -- حظر الحسابات الأخرى بنفس بصمة الجهاز
    UPDATE public.user_verification 
    SET is_banned = true,
        ban_reason = 'مرتبط بجهاز محظور - ' || ban_reason,
        updated_at = NOW()
    WHERE device_fingerprint = device_fingerprint
    AND telegram_id != p_telegram_id;
    
    -- إرجاع رسالة الحظر
    RETURN json_build_object(
      'success', true,
      'verified', false,
      'banned', true,
      'message', 'تم حظر الحساب: ' || ban_reason,
      'ban_reason', ban_reason,
      'duplicate_accounts', duplicate_accounts
    );
  END IF;
  
  -- نجح التحقق
  RETURN json_build_object(
    'success', true,
    'verified', true,
    'banned', false,
    'message', 'تم التحقق بنجاح!',
    'user_hash', p_user_hash
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'verified', false,
      'banned', false,
      'message', 'حدث خطأ في التحقق: ' || SQLERRM,
      'error', SQLERRM
    );
END;
$function$;

-- إضافة عمود بصمة الجهاز إلى جدول user_verification إذا لم يكن موجود
ALTER TABLE public.user_verification 
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_verification_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- إضافة فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_user_verification_device_fingerprint 
ON public.user_verification(device_fingerprint);

CREATE INDEX IF NOT EXISTS idx_user_verification_verification_time 
ON public.user_verification(last_verification_at);

-- دالة لتنظيف السجلات القديمة (تشغل تلقائياً)
CREATE OR REPLACE FUNCTION public.cleanup_old_verification_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- حذف السجلات الأقدم من 30 يوم والغير محظورة
  DELETE FROM public.user_verification 
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND NOT is_banned
  AND NOT is_verified;
  
  -- تحديث الإحصائيات
  ANALYZE public.user_verification;
END;
$function$;