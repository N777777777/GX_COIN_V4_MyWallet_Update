-- دالة لاستلام جميع العمولات المعلقة
CREATE OR REPLACE FUNCTION public.claim_all_commissions(p_user_telegram_id bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_record RECORD;
  total_pepe NUMERIC := 0;
  total_alpha NUMERIC := 0;
  total_gcoin NUMERIC := 0;
  claimed_count INTEGER := 0;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = p_user_telegram_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- حساب إجمالي العمولات المعلقة
  SELECT 
    COALESCE(SUM(CASE WHEN commission_type = 'pepe' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN commission_type = 'alpha' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN commission_type = 'gcoin_v4' THEN amount ELSE 0 END), 0),
    COUNT(*)
  INTO total_pepe, total_alpha, total_gcoin, claimed_count
  FROM public.pending_commissions
  WHERE referrer_user_id = user_record.id
  AND status = 'pending';
  
  -- التحقق من وجود عمولات معلقة
  IF claimed_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا توجد عمولات معلقة للاستلام'
    );
  END IF;
  
  -- إضافة العمولات إلى رصيد المستخدم
  UPDATE public.telegram_users 
  SET 
    pepe_withdrawable_balance = COALESCE(pepe_withdrawable_balance, 0) + total_pepe,
    bal_a6c3z = COALESCE(bal_a6c3z, 0) + total_alpha,
    bal_g4v7y = COALESCE(bal_g4v7y, 0) + total_gcoin,
    updated_at = now()
  WHERE id = user_record.id;
  
  -- تحديث حالة العمولات إلى claimed
  UPDATE public.pending_commissions
  SET 
    status = 'claimed',
    claimed_at = now(),
    updated_at = now()
  WHERE referrer_user_id = user_record.id
  AND status = 'pending';
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم استلام العمولات بنجاح',
    'total_pepe', total_pepe,
    'total_alpha', total_alpha,
    'total_gcoin', total_gcoin,
    'claimed_count', claimed_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ: ' || SQLERRM
    );
END;
$function$;