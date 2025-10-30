-- Create or replace the process_referral_commission function
CREATE OR REPLACE FUNCTION public.process_referral_commission(
  p_referred_telegram_id BIGINT,
  p_commission_type TEXT,
  p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referred_user_record RECORD;
  referrer_record RECORD;
  referral_record RECORD;
  commission_rate NUMERIC;
  commission_amount NUMERIC;
  manager_record RECORD;
  manager_commission_rate NUMERIC;
  manager_commission_amount NUMERIC;
BEGIN
  -- البحث عن المستخدم المُحال
  SELECT * INTO referred_user_record
  FROM public.telegram_users
  WHERE telegram_id = p_referred_telegram_id;
  
  IF referred_user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم المُحال غير موجود'
    );
  END IF;
  
  -- البحث عن علاقة الإحالة
  SELECT * INTO referral_record
  FROM public.referrals
  WHERE referred_telegram_id = p_referred_telegram_id;
  
  IF referral_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا توجد علاقة إحالة',
      'has_referrer', false
    );
  END IF;
  
  -- البحث عن المُحيل
  SELECT * INTO referrer_record
  FROM public.telegram_users
  WHERE telegram_id = referral_record.referrer_telegram_id;
  
  IF referrer_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المُحيل غير موجود'
    );
  END IF;
  
  -- تحديد نسبة العمولة بناءً على النوع
  IF p_commission_type = 'gcoin_v4' THEN
    commission_rate := 0.10; -- 10%
  ELSIF p_commission_type = 'pepe' THEN
    commission_rate := 0.60; -- 60%
  ELSIF p_commission_type = 'alpha' THEN
    commission_rate := 0.06; -- 6%
  ELSE
    commission_rate := 0.10; -- افتراضي 10%
  END IF;
  
  -- حساب مبلغ العمولة
  commission_amount := p_amount * commission_rate;
  
  -- إضافة العمولة إلى pending_commissions
  INSERT INTO public.pending_commissions (
    referrer_telegram_id,
    referred_telegram_id,
    commission_type,
    original_amount,
    commission_amount,
    commission_rate,
    status
  ) VALUES (
    referral_record.referrer_telegram_id,
    p_referred_telegram_id,
    p_commission_type,
    p_amount,
    commission_amount,
    commission_rate,
    'pending'
  );
  
  -- التحقق من وجود مدير للمُحيل ومعالجة عمولة المدير
  SELECT * INTO manager_record
  FROM public.manager_referrals
  WHERE user_telegram_id = referral_record.referrer_telegram_id
  AND is_active = true;
  
  IF manager_record IS NOT NULL THEN
    -- الحصول على نسبة عمولة المدير
    SELECT 
      CASE 
        WHEN p_commission_type = 'gcoin_v4' THEN gcoin_v4_commission_rate
        WHEN p_commission_type = 'pepe' THEN pepe_commission_rate
        WHEN p_commission_type = 'alpha' THEN alpha_commission_rate
        ELSE 0.10
      END INTO manager_commission_rate
    FROM public.manager_referral_commission_rates
    WHERE manager_telegram_id = manager_record.manager_telegram_id
    AND is_active = true
    LIMIT 1;
    
    IF manager_commission_rate IS NOT NULL AND manager_commission_rate > 0 THEN
      manager_commission_amount := p_amount * manager_commission_rate;
      
      -- إضافة عمولة المدير إلى pending_commissions
      INSERT INTO public.pending_commissions (
        referrer_telegram_id,
        referred_telegram_id,
        commission_type,
        original_amount,
        commission_amount,
        commission_rate,
        status,
        is_manager_commission
      ) VALUES (
        manager_record.manager_telegram_id,
        p_referred_telegram_id,
        p_commission_type,
        p_amount,
        manager_commission_amount,
        manager_commission_rate,
        'pending',
        true
      );
    END IF;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'referrer_telegram_id', referral_record.referrer_telegram_id,
    'commission_amount', commission_amount,
    'commission_rate', commission_rate,
    'commission_type', p_commission_type
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ: ' || SQLERRM
    );
END;
$$;