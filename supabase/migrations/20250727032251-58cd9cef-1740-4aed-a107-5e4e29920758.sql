-- اسكربت لتحسين وتزويد نظام الإحالات

-- 1. إضافة عمود لتتبع المكافآت المتراكمة للمُحيل
ALTER TABLE public.telegram_users 
ADD COLUMN IF NOT EXISTS total_referral_earnings NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_referrals_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_tier TEXT DEFAULT 'bronze';

-- 2. إنشاء دالة لحساب وتحديث إحصائيات الإحالات
CREATE OR REPLACE FUNCTION public.update_referral_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- تحديث إحصائيات الإحالات لكل مستخدم
  FOR user_record IN 
    SELECT 
      tu.id,
      tu.telegram_id,
      COALESCE(SUM(ur.reward_amount), 0) as total_earnings,
      COUNT(ur.id) as total_count
    FROM public.telegram_users tu
    LEFT JOIN public.user_referrals ur ON tu.telegram_id = ur.referrer_telegram_id
    WHERE ur.reward_amount > 0 OR ur.id IS NULL
    GROUP BY tu.id, tu.telegram_id
  LOOP
    -- تحديد المستوى حسب عدد الإحالات
    UPDATE public.telegram_users 
    SET 
      total_referral_earnings = user_record.total_earnings,
      total_referrals_count = user_record.total_count,
      referral_tier = CASE 
        WHEN user_record.total_count >= 100 THEN 'diamond'
        WHEN user_record.total_count >= 50 THEN 'gold'
        WHEN user_record.total_count >= 20 THEN 'silver'
        ELSE 'bronze'
      END
    WHERE id = user_record.id;
  END LOOP;
END;
$$;

-- 3. إنشاء دالة لمنح مكافآت إضافية حسب مستوى الإحالات
CREATE OR REPLACE FUNCTION public.give_tier_bonus_rewards()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_bonuses INTEGER := 0;
  user_record RECORD;
  bonus_amount NUMERIC;
BEGIN
  -- منح مكافآت إضافية حسب المستوى
  FOR user_record IN 
    SELECT id, telegram_id, first_name, referral_tier, total_referrals_count
    FROM public.telegram_users 
    WHERE total_referrals_count > 0
  LOOP
    -- حساب المكافأة حسب المستوى
    bonus_amount := CASE user_record.referral_tier
      WHEN 'diamond' THEN 50.0  -- 50 عملة للماسي
      WHEN 'gold' THEN 25.0     -- 25 عملة للذهبي  
      WHEN 'silver' THEN 10.0   -- 10 عملات للفضي
      WHEN 'bronze' THEN 2.0    -- 2 عملة للبرونزي
      ELSE 0
    END;
    
    IF bonus_amount > 0 THEN
      -- إضافة المكافأة
      UPDATE public.telegram_users 
      SET coins = coins + bonus_amount
      WHERE id = user_record.id;
      
      total_bonuses := total_bonuses + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم منح مكافآت المستويات بنجاح',
    'total_users_rewarded', total_bonuses
  );
END;
$$;

-- 4. إنشاء دالة لمنح مكافآت إضافية للإحالات النشطة
CREATE OR REPLACE FUNCTION public.reward_active_referrers()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_record RECORD;
  bonus_per_active NUMERIC := 1.0; -- 1 عملة لكل إحالة نشطة
  total_rewarded INTEGER := 0;
BEGIN
  -- العثور على المُحيلين الذين لديهم إحالات نشطة (دخلوا خلال آخر 7 أيام)
  FOR referrer_record IN 
    SELECT 
      ur.referrer_telegram_id,
      tu_referrer.id as referrer_id,
      tu_referrer.first_name,
      COUNT(tu_referred.id) as active_referrals
    FROM public.user_referrals ur
    JOIN public.telegram_users tu_referrer ON ur.referrer_telegram_id = tu_referrer.telegram_id
    JOIN public.telegram_users tu_referred ON ur.referred_telegram_id = tu_referred.telegram_id
    WHERE tu_referred.last_active >= NOW() - INTERVAL '7 days'
    GROUP BY ur.referrer_telegram_id, tu_referrer.id, tu_referrer.first_name
    HAVING COUNT(tu_referred.id) > 0
  LOOP
    -- منح مكافأة للإحالات النشطة
    UPDATE public.telegram_users 
    SET coins = coins + (referrer_record.active_referrals * bonus_per_active)
    WHERE id = referrer_record.referrer_id;
    
    total_rewarded := total_rewarded + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم منح مكافآت الإحالات النشطة',
    'total_referrers_rewarded', total_rewarded
  );
END;
$$;

-- 5. تشغيل تحديث الإحصائيات
SELECT public.update_referral_stats();

-- 6. منح مكافآت المستويات
SELECT public.give_tier_bonus_rewards();

-- 7. منح مكافآت الإحالات النشطة  
SELECT public.reward_active_referrers();