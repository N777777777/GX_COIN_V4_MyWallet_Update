-- تعديل دالة التأهيل لتجعل الجميع غير مؤهل
CREATE OR REPLACE FUNCTION public.is_user_qualified(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- إرجاع false دائماً - لا أحد مؤهل
  RETURN false;
END;
$$;