-- إضافة بعض عملات الألفا للمستخدمين الحديثين للاختبار
UPDATE public.telegram_users 
SET alpha_coins = 50.0 
WHERE alpha_coins = 0 
AND created_at >= '2025-09-01'::date;

-- إنشاء دالة لإضافة عملات الألفا للمستخدمين عند الحاجة
CREATE OR REPLACE FUNCTION public.add_alpha_coins_to_user(
  p_telegram_user_id UUID,
  p_amount NUMERIC
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
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
  
  -- إضافة عملات الألفا
  UPDATE public.telegram_users 
  SET alpha_coins = COALESCE(alpha_coins, 0) + p_amount,
      updated_at = now()
  WHERE id = p_telegram_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم إضافة ' || p_amount || ' عملة ألفا بنجاح',
    'new_balance', COALESCE(user_record.alpha_coins, 0) + p_amount
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء إضافة عملات الألفا: ' || SQLERRM
    );
END;
$$;