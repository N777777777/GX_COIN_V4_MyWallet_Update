-- حذف جميع العمولات المعلقة التي تم إنشاؤها بشكل خاطئ من الـ trigger
DELETE FROM public.pending_commissions
WHERE created_at >= '2025-01-20'  -- فقط العمولات الحديثة المشبوهة
AND status = 'pending';

-- تحديث دالة claim_all_commissions للتأكد من حذف العمولات بعد المطالبة
CREATE OR REPLACE FUNCTION public.claim_all_commissions(p_user_telegram_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_total_pepe NUMERIC := 0;
  v_total_alpha NUMERIC := 0;
  v_total_gcoin NUMERIC := 0;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO v_user
  FROM telegram_users
  WHERE telegram_id = p_user_telegram_id;

  IF v_user IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;

  -- حساب مجموع العمولات المعلقة
  SELECT 
    COALESCE(SUM(CASE WHEN commission_type = 'pepe' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN commission_type = 'alpha' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN commission_type = 'gcoin_v4' THEN amount ELSE 0 END), 0)
  INTO v_total_pepe, v_total_alpha, v_total_gcoin
  FROM pending_commissions
  WHERE referrer_user_id = v_user.id
  AND status = 'pending';

  -- التحقق من وجود عمولات للمطالبة
  IF v_total_pepe = 0 AND v_total_alpha = 0 AND v_total_gcoin = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا توجد عمولات معلقة للمطالبة بها'
    );
  END IF;

  -- إضافة العمولات للمستخدم
  UPDATE telegram_users
  SET 
    pepe_withdrawable_balance = COALESCE(pepe_withdrawable_balance, 0) + v_total_pepe,
    bal_a6c3z = COALESCE(bal_a6c3z, 0) + v_total_alpha,
    bal_g4v7y = COALESCE(bal_g4v7y, 0) + v_total_gcoin,
    updated_at = now()
  WHERE id = v_user.id;

  -- **حذف** العمولات المعلقة بدلاً من تحديث حالتها
  DELETE FROM pending_commissions
  WHERE referrer_user_id = v_user.id
  AND status = 'pending';

  RETURN json_build_object(
    'success', true,
    'total_pepe', v_total_pepe,
    'total_alpha', v_total_alpha,
    'total_gcoin', v_total_gcoin,
    'message', 'تم المطالبة بجميع العمولات بنجاح'
  );
END;
$$;