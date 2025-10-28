-- إصلاح سياسات RLS لجدول user_verification لضمان عمل الويب هوك بشكل صحيح

-- أولاً، إضافة سياسة للسماح للـ service role بإدارة التحقق
DROP POLICY IF EXISTS "Service role can manage user verification" ON public.user_verification;
CREATE POLICY "Service role can manage user verification" 
ON public.user_verification 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- السماح للمستخدمين بعرض حالة التحقق الخاصة بهم
DROP POLICY IF EXISTS "Users can view their own verification status" ON public.user_verification;
CREATE POLICY "Users can view their own verification status" 
ON public.user_verification 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id IN (
      SELECT id FROM public.telegram_users WHERE telegram_id = user_verification.telegram_id
    )
    AND COALESCE(s.is_active, true) = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND s.session_token = public.get_request_header('x-session-token')
  )
  OR user_verification.telegram_id::text = auth.uid()::text
);

-- تحديث دالة process_verification_webhook لضمان عملها الصحيح
CREATE OR REPLACE FUNCTION public.process_verification_webhook(
  p_telegram_id bigint, 
  p_user_hash text, 
  p_captcha_status text, 
  p_vpn_detected text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      'success', true,
      'verified', true,
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
    ON CONFLICT (telegram_id) 
    DO UPDATE SET
      user_hash = EXCLUDED.user_hash,
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
      p_user_hash || '_duplicate_' || extract(epoch from now())::text,
      false,
      true,
      'استخدام حسابات متعددة محظور'
    )
    ON CONFLICT (telegram_id) 
    DO UPDATE SET
      user_hash = EXCLUDED.user_hash,
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
    ON CONFLICT (telegram_id) 
    DO UPDATE SET
      user_hash = EXCLUDED.user_hash,
      is_verified = true,
      is_banned = false,
      verification_date = now(),
      updated_at = now();
    
    -- تحديث جدول المستخدمين
    UPDATE public.telegram_users 
    SET 
      is_verified = true,
      verification_required = false,
      updated_at = now()
    WHERE telegram_id = p_telegram_id;
    
    RETURN json_build_object(
      'success', true,
      'verified', true,
      'message', '✅ تم التحقق بنجاح! يمكنك الآن استخدام البوت.'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'فشل في التحقق من الكابتشا'
    );
  END IF;
END;
$$;