-- إنشاء دالة لجلب المستخدمين المؤهلين
CREATE OR REPLACE FUNCTION public.get_qualified_users_list()
RETURNS TABLE(
  id UUID,
  telegram_id BIGINT,
  telegram_user_id UUID,
  first_name TEXT,
  username TEXT,
  qualification_date TIMESTAMP WITH TIME ZONE,
  qualification_type TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qu.id,
    qu.telegram_id,
    qu.telegram_user_id,
    qu.first_name,
    qu.username,
    qu.qualification_date,
    qu.qualification_type,
    qu.is_active
  FROM public.qualified_users qu
  WHERE qu.is_active = true
  ORDER BY qu.qualification_date DESC;
END;
$$;