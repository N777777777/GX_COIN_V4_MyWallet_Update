-- Fix Security Definer issues step by step
-- First, drop the existing function that has parameter conflicts
DROP FUNCTION IF EXISTS public.is_user_qualified(uuid);

-- Now recreate the function without SECURITY DEFINER to rely on RLS
CREATE OR REPLACE FUNCTION public.is_user_qualified(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  user_record RECORD;
  qualified BOOLEAN := FALSE;
BEGIN
  -- Check qualified_users table
  SELECT 1 INTO user_record
  FROM public.qualified_users qu
  JOIN public.telegram_users tu ON qu.telegram_id = tu.telegram_id
  WHERE tu.id = p_user_id 
  AND qu.is_active = true;
  
  IF FOUND THEN
    RETURN true;
  END IF;
  
  -- Check manual_qualified_users table
  SELECT 1 INTO user_record
  FROM public.manual_qualified_users mqu
  JOIN public.telegram_users tu ON mqu.telegram_id = tu.telegram_id
  WHERE tu.id = p_user_id 
  AND mqu.is_active = true;
  
  IF FOUND THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;