-- تعديل دالة زيادة القيمة السوقية لتصبح 0.0025
CREATE OR REPLACE FUNCTION public.increment_market_value(amount numeric DEFAULT 0.0025)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_value NUMERIC;
BEGIN
  -- تحديث القيمة السوقية
  UPDATE public.global_market_value 
  SET total_value = total_value + amount,
      updated_at = now()
  WHERE id = (SELECT id FROM public.global_market_value LIMIT 1)
  RETURNING total_value INTO new_value;
  
  RETURN new_value;
END;
$function$