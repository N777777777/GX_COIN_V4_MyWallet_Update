-- إزالة الجداول القديمة وإنشاء نظام إحالات جديد بالكامل

-- حذف الجداول القديمة
DROP TABLE IF EXISTS referral_earnings CASCADE;
DROP TABLE IF EXISTS user_referrals CASCADE;

-- إنشاء جدول الإحالات الجديد (بسيط وفعال)
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_telegram_id BIGINT NOT NULL,
  referrer_user_id UUID NOT NULL,
  referred_telegram_id BIGINT NOT NULL,
  referred_user_id UUID NOT NULL,
  
  -- حالة الإحالة
  status TEXT NOT NULL DEFAULT 'pending', -- pending, channel_joined, qualified
  
  -- تواريخ مهمة
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  channel_joined_at TIMESTAMP WITH TIME ZONE,
  qualified_at TIMESTAMP WITH TIME ZONE,
  
  -- العمولات المدفوعة
  pepe_commission_paid NUMERIC DEFAULT 0,
  alpha_commission_paid NUMERIC DEFAULT 0,
  gcoin_v4_commission_paid NUMERIC DEFAULT 0,
  
  -- منع التكرار
  UNIQUE(referred_telegram_id)
);

-- الفهارس لتحسين الأداء
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_telegram_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_telegram_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);

-- تفعيل RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_sessions s
    WHERE s.telegram_user_id = referrals.referrer_user_id
    AND COALESCE(s.is_active, true) = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND s.session_token = public.get_request_header('x-session-token')
  )
);

CREATE POLICY "Service role can manage referrals"
ON public.referrals FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- دالة معالجة الإحالة عند الاشتراك في القناة
CREATE OR REPLACE FUNCTION public.process_referral_on_channel_join(
  p_referred_telegram_id BIGINT,
  p_referrer_telegram_id BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_record RECORD;
  v_referred_record RECORD;
  v_existing_referral RECORD;
  v_referral_id UUID;
BEGIN
  -- التحقق من عدم الإحالة الذاتية
  IF p_referred_telegram_id = p_referrer_telegram_id THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا يمكن إحالة نفسك'
    );
  END IF;

  -- الحصول على بيانات المستخدمين
  SELECT * INTO v_referrer_record FROM public.telegram_users WHERE telegram_id = p_referrer_telegram_id;
  SELECT * INTO v_referred_record FROM public.telegram_users WHERE telegram_id = p_referred_telegram_id;
  
  IF v_referrer_record IS NULL OR v_referred_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'أحد المستخدمين غير موجود'
    );
  END IF;

  -- التحقق من عدم وجود إحالة سابقة
  SELECT * INTO v_existing_referral 
  FROM public.referrals 
  WHERE referred_telegram_id = p_referred_telegram_id;
  
  IF v_existing_referral IS NOT NULL THEN
    -- إذا كانت الإحالة موجودة لكن لم يتم الاشتراك في القناة بعد
    IF v_existing_referral.status = 'pending' THEN
      UPDATE public.referrals 
      SET 
        status = 'channel_joined',
        channel_joined_at = now()
      WHERE id = v_existing_referral.id;
      
      RETURN json_build_object(
        'success', true,
        'message', 'تم تحديث حالة الإحالة - تم الاشتراك في القناة',
        'referral_id', v_existing_referral.id,
        'new_status', 'channel_joined'
      );
    ELSE
      RETURN json_build_object(
        'success', false,
        'message', 'المستخدم لديه إحالة سابقة'
      );
    END IF;
  END IF;

  -- إنشاء إحالة جديدة
  INSERT INTO public.referrals (
    referrer_telegram_id,
    referrer_user_id,
    referred_telegram_id,
    referred_user_id,
    status,
    channel_joined_at
  ) VALUES (
    p_referrer_telegram_id,
    v_referrer_record.id,
    p_referred_telegram_id,
    v_referred_record.id,
    'channel_joined',
    now()
  ) RETURNING id INTO v_referral_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم تسجيل الإحالة بنجاح',
    'referral_id', v_referral_id,
    'status', 'channel_joined'
  );
END;
$$;

-- دالة معالجة العمولات عند ربح المُحال
CREATE OR REPLACE FUNCTION public.process_referral_commission(
  p_referred_telegram_id BIGINT,
  p_commission_type TEXT, -- 'pepe', 'alpha', 'gcoin_v4'
  p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
BEGIN
  -- الحصول على بيانات الإحالة
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_telegram_id = p_referred_telegram_id
  AND status IN ('channel_joined', 'qualified');
  
  IF v_referral IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا توجد إحالة نشطة'
    );
  END IF;

  -- تحديد نسبة العمولة حسب النوع
  CASE p_commission_type
    WHEN 'pepe' THEN v_commission_rate := 0.35; -- 35%
    WHEN 'alpha' THEN v_commission_rate := 0.03; -- 3%
    WHEN 'gcoin_v4' THEN v_commission_rate := 0.05; -- 5%
    ELSE 
      RETURN json_build_object('success', false, 'message', 'نوع عمولة غير صحيح');
  END CASE;

  -- حساب مبلغ العمولة
  v_commission_amount := p_amount * v_commission_rate;

  -- إضافة العمولة للمُحيل
  CASE p_commission_type
    WHEN 'pepe' THEN
      UPDATE public.telegram_users 
      SET pepe_withdrawable_balance = COALESCE(pepe_withdrawable_balance, 0) + v_commission_amount
      WHERE id = v_referral.referrer_user_id;
      
      UPDATE public.referrals
      SET pepe_commission_paid = COALESCE(pepe_commission_paid, 0) + v_commission_amount
      WHERE id = v_referral.id;
      
    WHEN 'alpha' THEN
      UPDATE public.telegram_users 
      SET bal_a9kx2 = COALESCE(bal_a9kx2, 0) + v_commission_amount
      WHERE id = v_referral.referrer_user_id;
      
      UPDATE public.referrals
      SET alpha_commission_paid = COALESCE(alpha_commission_paid, 0) + v_commission_amount
      WHERE id = v_referral.id;
      
    WHEN 'gcoin_v4' THEN
      UPDATE public.telegram_users 
      SET bal_g4v7y = COALESCE(bal_g4v7y, 0) + v_commission_amount
      WHERE id = v_referral.referrer_user_id;
      
      UPDATE public.referrals
      SET gcoin_v4_commission_paid = COALESCE(gcoin_v4_commission_paid, 0) + v_commission_amount
      WHERE id = v_referral.id;
  END CASE;

  -- تسجيل العمولة في جدول commission_earnings
  INSERT INTO public.commission_earnings (
    earner_type,
    commission_type,
    amount,
    source_user_telegram_id
  ) VALUES (
    'referrer',
    p_commission_type,
    v_commission_amount,
    p_referred_telegram_id
  );

  RETURN json_build_object(
    'success', true,
    'commission_amount', v_commission_amount,
    'commission_rate', v_commission_rate,
    'commission_type', p_commission_type
  );
END;
$$;