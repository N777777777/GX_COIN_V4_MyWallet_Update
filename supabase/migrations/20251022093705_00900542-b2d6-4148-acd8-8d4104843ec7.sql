-- تحديث دالة متصدري الإحالات لاستبعاد المحظورين
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
  WHERE (tu.status IS NULL OR tu.status != 'banned')
    AND (tu.is_blocked IS NULL OR tu.is_blocked = false)
  GROUP BY tu.telegram_id, tu.first_name, tu.username
  HAVING COUNT(r.id) > 0
  ORDER BY COUNT(r.id) DESC
  LIMIT limit_count;
END;
$$;

-- تحديث دالة متصدري العملات لاستبعاد المحظورين
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
    AND (tu.status IS NULL OR tu.status != 'banned')
    AND (tu.is_blocked IS NULL OR tu.is_blocked = false)
  ORDER BY tu.coins DESC
  LIMIT limit_count;
END;
$$;