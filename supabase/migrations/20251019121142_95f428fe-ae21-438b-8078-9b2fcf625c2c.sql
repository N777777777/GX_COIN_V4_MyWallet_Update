-- إنشاء جدول العمولات المعلقة
CREATE TABLE IF NOT EXISTS public.pending_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES telegram_users(id),
  referrer_telegram_id BIGINT NOT NULL,
  referred_user_id UUID NOT NULL REFERENCES telegram_users(id),
  referred_telegram_id BIGINT NOT NULL,
  referral_id UUID NOT NULL REFERENCES referrals(id),
  commission_type TEXT NOT NULL CHECK (commission_type IN ('pepe', 'alpha', 'gcoin_v4')),
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed')),
  source_description TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_pending_commissions_referrer ON pending_commissions(referrer_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_commissions_referral ON pending_commissions(referral_id);

-- تفعيل RLS
ALTER TABLE public.pending_commissions ENABLE ROW LEVEL SECURITY;

-- سياسة للسماح للمستخدمين برؤية عمولاتهم المعلقة
CREATE POLICY "Users can view their pending commissions"
ON public.pending_commissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_sessions s
    WHERE s.telegram_user_id = pending_commissions.referrer_user_id
    AND COALESCE(s.is_active, true) = true
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND s.session_token = get_request_header('x-session-token')
  )
);

-- سياسة للسماح لـ service role بإدارة العمولات
CREATE POLICY "Service role can manage pending commissions"
ON public.pending_commissions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- دالة لتسجيل عمولة معلقة جديدة
CREATE OR REPLACE FUNCTION public.add_pending_commission(
  p_referrer_user_id UUID,
  p_referrer_telegram_id BIGINT,
  p_referred_user_id UUID,
  p_referred_telegram_id BIGINT,
  p_referral_id UUID,
  p_commission_type TEXT,
  p_amount NUMERIC,
  p_source_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_id UUID;
BEGIN
  -- التحقق من صحة المعطيات
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المبلغ يجب أن يكون أكبر من صفر'
    );
  END IF;

  -- إضافة العمولة المعلقة
  INSERT INTO public.pending_commissions (
    referrer_user_id,
    referrer_telegram_id,
    referred_user_id,
    referred_telegram_id,
    referral_id,
    commission_type,
    amount,
    source_description
  ) VALUES (
    p_referrer_user_id,
    p_referrer_telegram_id,
    p_referred_user_id,
    p_referred_telegram_id,
    p_referral_id,
    p_commission_type,
    p_amount,
    p_source_description
  ) RETURNING id INTO v_commission_id;

  RETURN json_build_object(
    'success', true,
    'commission_id', v_commission_id,
    'amount', p_amount,
    'type', p_commission_type
  );
END;
$$;

-- دالة للمطالبة بجميع العمولات المعلقة
CREATE OR REPLACE FUNCTION public.claim_all_commissions(
  p_user_telegram_id BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_commission RECORD;
  v_total_pepe NUMERIC := 0;
  v_total_alpha NUMERIC := 0;
  v_total_gcoin NUMERIC := 0;
  v_claimed_count INTEGER := 0;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO v_user_record 
  FROM telegram_users 
  WHERE telegram_id = p_user_telegram_id;
  
  IF v_user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;

  -- جلب جميع العمولات المعلقة
  FOR v_commission IN 
    SELECT * FROM pending_commissions 
    WHERE referrer_user_id = v_user_record.id 
    AND status = 'pending'
  LOOP
    -- تحديث الرصيد حسب نوع العمولة
    IF v_commission.commission_type = 'pepe' THEN
      UPDATE telegram_users 
      SET pepe_withdrawable_balance = pepe_withdrawable_balance + v_commission.amount
      WHERE id = v_user_record.id;
      v_total_pepe := v_total_pepe + v_commission.amount;
      
    ELSIF v_commission.commission_type = 'alpha' THEN
      UPDATE telegram_users 
      SET bal_a6c3z = bal_a6c3z + v_commission.amount
      WHERE id = v_user_record.id;
      v_total_alpha := v_total_alpha + v_commission.amount;
      
    ELSIF v_commission.commission_type = 'gcoin_v4' THEN
      UPDATE telegram_users 
      SET bal_g4v7y = bal_g4v7y + v_commission.amount
      WHERE id = v_user_record.id;
      v_total_gcoin := v_total_gcoin + v_commission.amount;
    END IF;

    -- تحديث حالة العمولة إلى claimed
    UPDATE pending_commissions 
    SET status = 'claimed', 
        claimed_at = now(),
        updated_at = now()
    WHERE id = v_commission.id;

    -- تحديث جدول الإحالات
    IF v_commission.commission_type = 'pepe' THEN
      UPDATE referrals 
      SET pepe_commission_paid = pepe_commission_paid + v_commission.amount
      WHERE id = v_commission.referral_id;
    ELSIF v_commission.commission_type = 'alpha' THEN
      UPDATE referrals 
      SET alpha_commission_paid = alpha_commission_paid + v_commission.amount
      WHERE id = v_commission.referral_id;
    ELSIF v_commission.commission_type = 'gcoin_v4' THEN
      UPDATE referrals 
      SET gcoin_v4_commission_paid = gcoin_v4_commission_paid + v_commission.amount
      WHERE id = v_commission.referral_id;
    END IF;

    v_claimed_count := v_claimed_count + 1;
  END LOOP;

  IF v_claimed_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا توجد عمولات معلقة للمطالبة بها'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'claimed_count', v_claimed_count,
    'total_pepe', v_total_pepe,
    'total_alpha', v_total_alpha,
    'total_gcoin', v_total_gcoin,
    'message', 'تم المطالبة بجميع العمولات بنجاح'
  );
END;
$$;

-- تحديث دالة معالجة العمولات لإضافتها كعمولات معلقة بدلاً من مباشرة
CREATE OR REPLACE FUNCTION public.process_referral_commission(
  p_referred_telegram_id BIGINT,
  p_commission_type TEXT,
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
  v_result JSON;
BEGIN
  -- البحث عن الإحالة
  SELECT * INTO v_referral
  FROM referrals
  WHERE referred_telegram_id = p_referred_telegram_id
  AND status IN ('channel_joined', 'qualified')
  LIMIT 1;

  IF v_referral IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا توجد إحالة نشطة لهذا المستخدم'
    );
  END IF;

  -- تحديد نسبة العمولة حسب النوع
  IF p_commission_type = 'pepe' THEN
    v_commission_rate := 0.35; -- 35%
  ELSIF p_commission_type = 'alpha' THEN
    v_commission_rate := 0.03; -- 3%
  ELSIF p_commission_type = 'gcoin_v4' THEN
    v_commission_rate := 0.05; -- 5%
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'نوع عمولة غير صالح'
    );
  END IF;

  -- حساب مبلغ العمولة
  v_commission_amount := p_amount * v_commission_rate;

  -- إضافة العمولة المعلقة
  SELECT add_pending_commission(
    v_referral.referrer_user_id,
    v_referral.referrer_telegram_id,
    v_referral.referred_user_id,
    v_referral.referred_telegram_id,
    v_referral.id,
    p_commission_type,
    v_commission_amount,
    'عمولة من ' || p_commission_type || ' بمبلغ ' || p_amount
  ) INTO v_result;

  RETURN v_result;
END;
$$;