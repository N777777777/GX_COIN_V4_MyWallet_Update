-- تحديث دالة متصدري العملات لعرض G COIN فقط
CREATE OR REPLACE FUNCTION get_coins_leaderboard(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  telegram_id BIGINT,
  first_name TEXT,
  username TEXT,
  total_balance NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.telegram_id,
    tu.first_name,
    tu.username,
    COALESCE(tu.bal_g4v7y, 0) as total_balance
  FROM telegram_users tu
  WHERE (tu.status IS NULL OR tu.status != 'banned')
    AND (tu.is_blocked IS NULL OR tu.is_blocked = false)
    AND COALESCE(tu.bal_g4v7y, 0) > 0
  ORDER BY tu.bal_g4v7y DESC
  LIMIT limit_count;
END;
$$;