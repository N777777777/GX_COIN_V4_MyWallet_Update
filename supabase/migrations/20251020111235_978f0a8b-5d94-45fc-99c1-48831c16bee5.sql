-- إنشاء trigger لمعالجة العمولات تلقائياً عند تحديث أرصدة المستخدمين المُحالين
CREATE OR REPLACE FUNCTION public.auto_process_referral_commissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pepe_diff NUMERIC;
  v_alpha_diff NUMERIC;
  v_gcoin_diff NUMERIC;
BEGIN
  -- حساب الفرق في الأرصدة
  v_pepe_diff := COALESCE(NEW.bal_w5r2t, 0) - COALESCE(OLD.bal_w5r2t, 0);
  v_alpha_diff := COALESCE(NEW.bal_a6c3z, 0) - COALESCE(OLD.bal_a6c3z, 0);
  v_gcoin_diff := COALESCE(NEW.bal_g4v7y, 0) - COALESCE(OLD.bal_g4v7y, 0);
  
  -- معالجة عمولة PEPE إذا كانت موجبة
  IF v_pepe_diff > 0 THEN
    PERFORM process_referral_commission(
      NEW.telegram_id,
      'pepe',
      v_pepe_diff
    );
  END IF;
  
  -- معالجة عمولة ALPHA إذا كانت موجبة
  IF v_alpha_diff > 0 THEN
    PERFORM process_referral_commission(
      NEW.telegram_id,
      'alpha',
      v_alpha_diff
    );
  END IF;
  
  -- معالجة عمولة G COIN إذا كانت موجبة
  IF v_gcoin_diff > 0 THEN
    PERFORM process_referral_commission(
      NEW.telegram_id,
      'gcoin_v4',
      v_gcoin_diff
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- إنشاء Trigger على جدول telegram_users
DROP TRIGGER IF EXISTS trigger_auto_referral_commissions ON telegram_users;
CREATE TRIGGER trigger_auto_referral_commissions
AFTER UPDATE OF bal_w5r2t, bal_a6c3z, bal_g4v7y ON telegram_users
FOR EACH ROW
EXECUTE FUNCTION auto_process_referral_commissions();