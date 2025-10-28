-- إضافة أعمدة بسيطة لنظام الإحالة المبسط في جدول referrals
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS reward_gcoin NUMERIC DEFAULT 0.1,
ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE;

-- إنشاء دالة بسيطة لحساب الإحالات غير المطالب بها
CREATE OR REPLACE FUNCTION get_unclaimed_referrals_count(p_referrer_telegram_id BIGINT)
RETURNS TABLE (
  total_referrals INTEGER,
  unclaimed_count INTEGER,
  total_reward NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_referrals,
    COUNT(*) FILTER (WHERE NOT reward_claimed)::INTEGER as unclaimed_count,
    (COUNT(*) FILTER (WHERE NOT reward_claimed) * 0.1)::NUMERIC as total_reward
  FROM referrals
  WHERE referrer_telegram_id = p_referrer_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء دالة بسيطة للمطالبة بمكافآت الإحالات
CREATE OR REPLACE FUNCTION claim_referral_rewards(p_referrer_telegram_id BIGINT)
RETURNS TABLE (
  success BOOLEAN,
  claimed_count INTEGER,
  total_gcoin NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_referrer_user_id UUID;
  v_unclaimed_count INTEGER;
  v_total_reward NUMERIC;
BEGIN
  -- الحصول على معرف المستخدم
  SELECT id INTO v_referrer_user_id
  FROM telegram_users
  WHERE telegram_id = p_referrer_telegram_id;

  IF v_referrer_user_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 0::NUMERIC, 'User not found';
    RETURN;
  END IF;

  -- حساب الإحالات غير المطالب بها
  SELECT COUNT(*) INTO v_unclaimed_count
  FROM referrals
  WHERE referrer_telegram_id = p_referrer_telegram_id
    AND NOT reward_claimed;

  IF v_unclaimed_count = 0 THEN
    RETURN QUERY SELECT false, 0, 0::NUMERIC, 'No unclaimed rewards';
    RETURN;
  END IF;

  -- حساب المكافأة الإجمالية
  v_total_reward := v_unclaimed_count * 0.1;

  -- تحديث رصيد G COIN للمستخدم
  UPDATE telegram_users
  SET bal_g4v7y = COALESCE(bal_g4v7y, 0) + v_total_reward,
      updated_at = NOW()
  WHERE id = v_referrer_user_id;

  -- تحديث حالة الإحالات إلى "تم المطالبة"
  UPDATE referrals
  SET reward_claimed = true,
      claimed_at = NOW()
  WHERE referrer_telegram_id = p_referrer_telegram_id
    AND NOT reward_claimed;

  -- إدراج سجل في balance_audit_log
  INSERT INTO balance_audit_log (
    telegram_user_id,
    telegram_id,
    balance_type,
    operation_type,
    amount_changed,
    old_balance,
    new_balance,
    source
  )
  SELECT 
    v_referrer_user_id,
    p_referrer_telegram_id,
    'gcoin_v4',
    'add',
    v_total_reward,
    COALESCE(bal_g4v7y, 0) - v_total_reward,
    COALESCE(bal_g4v7y, 0),
    'referral_rewards_claim'
  FROM telegram_users
  WHERE id = v_referrer_user_id;

  RETURN QUERY SELECT 
    true, 
    v_unclaimed_count, 
    v_total_reward, 
    format('Successfully claimed %s G COIN from %s referrals!', v_total_reward, v_unclaimed_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_unclaimed_referrals_count(BIGINT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION claim_referral_rewards(BIGINT) TO authenticated, anon;