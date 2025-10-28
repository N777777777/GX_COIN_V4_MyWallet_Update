-- Create a function to get the referral leaderboard
CREATE OR REPLACE FUNCTION get_referral_leaderboard(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  telegram_id BIGINT,
  first_name TEXT,
  username TEXT,
  referral_count BIGINT
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
    COUNT(r.id)::BIGINT as referral_count
  FROM telegram_users tu
  INNER JOIN referrals r ON r.referrer_telegram_id = tu.telegram_id
  GROUP BY tu.telegram_id, tu.first_name, tu.username
  HAVING COUNT(r.id) > 0
  ORDER BY COUNT(r.id) DESC
  LIMIT limit_count;
END;
$$;