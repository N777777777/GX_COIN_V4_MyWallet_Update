-- إنشاء دالة لزيادة رصيد TON بشكل آمن
CREATE OR REPLACE FUNCTION public.increment_ton_balance(user_id uuid, amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance numeric;
BEGIN
  UPDATE public.telegram_users 
  SET ton_balance = ton_balance + amount
  WHERE id = user_id
  RETURNING ton_balance INTO new_balance;
  
  RETURN new_balance;
END;
$$;