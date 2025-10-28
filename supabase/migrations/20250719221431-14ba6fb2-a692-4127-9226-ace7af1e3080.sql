-- إنشاء دالة لإضافة الرصيد بأمان
CREATE OR REPLACE FUNCTION public.add_balance(user_id uuid, amount numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إضافة الرصيد للمستخدم
  UPDATE public.telegram_users 
  SET ton_balance = ton_balance + amount
  WHERE id = user_id;
  
  -- التحقق من نجاح العملية
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;