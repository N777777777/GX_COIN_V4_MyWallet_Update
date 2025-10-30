-- إعادة تعيين جميع عملات الألفا للصفر
UPDATE public.telegram_users 
SET alpha_coins = 0;

-- تحديث دالة updateUserStats لتحديث alpha_coins بدلاً من coins
CREATE OR REPLACE FUNCTION public.update_user_stats(
  p_telegram_user_id UUID,
  p_coins_earned NUMERIC,
  p_energy_used INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  new_energy INTEGER;
  referrer_bonus NUMERIC := 0;
BEGIN
  -- البحث عن المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE id = p_telegram_user_id;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- حساب الطاقة الجديدة
  new_energy := GREATEST(0, COALESCE(user_record.energy, 1000) - p_energy_used);
  
  -- تحديث الإحصائيات (إضافة العملات إلى alpha_coins)
  UPDATE public.telegram_users 
  SET 
    alpha_coins = COALESCE(alpha_coins, 0) + p_coins_earned,
    energy = new_energy,
    last_active = now(),
    updated_at = now()
  WHERE id = p_telegram_user_id;
  
  -- معالجة مكافآت الإحالة إذا وُجدت
  IF user_record.referrer_telegram_id IS NOT NULL AND p_coins_earned > 0 THEN
    referrer_bonus := p_coins_earned * 0.1; -- 10% مكافأة للمُحيل
    
    -- إضافة المكافأة للمُحيل في alpha_coins
    UPDATE public.telegram_users 
    SET 
      alpha_coins = COALESCE(alpha_coins, 0) + referrer_bonus,
      total_referral_earnings = COALESCE(total_referral_earnings, 0) + referrer_bonus,
      updated_at = now()
    WHERE telegram_id = user_record.referrer_telegram_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'new_alpha_coins', COALESCE(user_record.alpha_coins, 0) + p_coins_earned,
    'new_energy', new_energy,
    'referrer_bonus', referrer_bonus
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء تحديث الإحصائيات: ' || SQLERRM
    );
END;
$$;