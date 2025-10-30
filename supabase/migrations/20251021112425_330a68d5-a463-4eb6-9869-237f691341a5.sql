-- Create a function to get the coins leaderboard
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
    tu.coins as total_balance
  FROM telegram_users tu
  WHERE tu.coins > 0
  ORDER BY tu.coins DESC
  LIMIT limit_count;
END;
$$;