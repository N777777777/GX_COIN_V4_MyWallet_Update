-- تحديث دالة المطالبة بالعمولات لإصلاح مشكلة NULL
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
    -- تحديث الرصيد حسب نوع العمولة مع استخدام COALESCE لتجنب مشكلة NULL
    IF v_commission.commission_type = 'pepe' THEN
      UPDATE telegram_users 
      SET pepe_withdrawable_balance = COALESCE(pepe_withdrawable_balance, 0) + v_commission.amount
      WHERE id = v_user_record.id;
      v_total_pepe := v_total_pepe + v_commission.amount;
      
    ELSIF v_commission.commission_type = 'alpha' THEN
      UPDATE telegram_users 
      SET bal_a6c3z = COALESCE(bal_a6c3z, 0) + v_commission.amount
      WHERE id = v_user_record.id;
      v_total_alpha := v_total_alpha + v_commission.amount;
      
    ELSIF v_commission.commission_type = 'gcoin_v4' THEN
      UPDATE telegram_users 
      SET bal_g4v7y = COALESCE(bal_g4v7y, 0) + v_commission.amount
      WHERE id = v_user_record.id;
      v_total_gcoin := v_total_gcoin + v_commission.amount;
    END IF;

    -- تحديث حالة العمولة إلى claimed
    UPDATE pending_commissions 
    SET status = 'claimed', 
        claimed_at = now(),
        updated_at = now()
    WHERE id = v_commission.id;

    -- تحديث جدول الإحالات مع استخدام COALESCE
    IF v_commission.commission_type = 'pepe' THEN
      UPDATE referrals 
      SET pepe_commission_paid = COALESCE(pepe_commission_paid, 0) + v_commission.amount
      WHERE id = v_commission.referral_id;
    ELSIF v_commission.commission_type = 'alpha' THEN
      UPDATE referrals 
      SET alpha_commission_paid = COALESCE(alpha_commission_paid, 0) + v_commission.amount
      WHERE id = v_commission.referral_id;
    ELSIF v_commission.commission_type = 'gcoin_v4' THEN
      UPDATE referrals 
      SET gcoin_v4_commission_paid = COALESCE(gcoin_v4_commission_paid, 0) + v_commission.amount
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