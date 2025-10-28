-- إنشاء دالة لجلب متصدري الإحالات
CREATE OR REPLACE FUNCTION public.get_referral_leaderboard()
RETURNS TABLE (
  telegram_id BIGINT,
  first_name TEXT,
  username TEXT,
  referral_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.referrer_telegram_id,
    tu.first_name,
    tu.username,
    COUNT(*) as referral_count
  FROM public.user_referrals ur
  JOIN public.telegram_users tu ON ur.referrer_telegram_id = tu.telegram_id
  WHERE ur.reward_amount > 0  -- فقط الإحالات التي حصلت على مكافآت
  GROUP BY ur.referrer_telegram_id, tu.first_name, tu.username
  ORDER BY referral_count DESC
  LIMIT 50;
END;
$$;