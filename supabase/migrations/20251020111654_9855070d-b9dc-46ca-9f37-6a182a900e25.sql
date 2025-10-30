-- إضافة العمولات للأرصدة الموجودة (Retroactive Commissions)
DO $$
DECLARE
  v_referral RECORD;
  v_result JSON;
BEGIN
  FOR v_referral IN 
    SELECT 
      r.id as referral_id,
      r.referrer_user_id,
      r.referrer_telegram_id,
      r.referred_user_id,
      r.referred_telegram_id,
      tu.bal_w5r2t as pepe_balance,
      tu.bal_a6c3z as alpha_balance,
      tu.bal_g4v7y as gcoin_balance
    FROM referrals r
    JOIN telegram_users tu ON tu.telegram_id = r.referred_telegram_id
    WHERE r.status IN ('channel_joined', 'qualified')
  LOOP
    -- إضافة عمولة PEPE إذا كان الرصيد > 0
    IF COALESCE(v_referral.pepe_balance, 0) > 0 THEN
      SELECT add_pending_commission(
        v_referral.referrer_user_id,
        v_referral.referrer_telegram_id,
        v_referral.referred_user_id,
        v_referral.referred_telegram_id,
        v_referral.referral_id,
        'pepe',
        v_referral.pepe_balance * 0.35,
        'Retroactive commission - Existing PEPE balance'
      ) INTO v_result;
    END IF;
    
    -- إضافة عمولة ALPHA إذا كان الرصيد > 0
    IF COALESCE(v_referral.alpha_balance, 0) > 0 THEN
      SELECT add_pending_commission(
        v_referral.referrer_user_id,
        v_referral.referrer_telegram_id,
        v_referral.referred_user_id,
        v_referral.referred_telegram_id,
        v_referral.referral_id,
        'alpha',
        v_referral.alpha_balance * 0.03,
        'Retroactive commission - Existing ALPHA balance'
      ) INTO v_result;
    END IF;
    
    -- إضافة عمولة G COIN إذا كان الرصيد > 0
    IF COALESCE(v_referral.gcoin_balance, 0) > 0 THEN
      SELECT add_pending_commission(
        v_referral.referrer_user_id,
        v_referral.referrer_telegram_id,
        v_referral.referred_user_id,
        v_referral.referred_telegram_id,
        v_referral.referral_id,
        'gcoin_v4',
        v_referral.gcoin_balance * 0.05,
        'Retroactive commission - Existing G COIN balance'
      ) INTO v_result;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Retroactive commissions added successfully';
END $$;