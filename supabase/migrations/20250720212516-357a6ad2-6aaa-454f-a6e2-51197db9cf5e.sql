-- إعادة تفعيل دالة التأهيل للتحقق من مهمة KuCoin
CREATE OR REPLACE FUNCTION public.is_user_qualified(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_completed_kucoin BOOLEAN := FALSE;
BEGIN
  -- التحقق من إكمال مهمة KuCoin فقط
  SELECT EXISTS (
    SELECT 1 FROM public.completed_tasks 
    WHERE telegram_user_id = user_id AND task_id = '6'
  ) INTO has_completed_kucoin;
  
  RETURN has_completed_kucoin;
END;
$$;