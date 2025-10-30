-- سكربت لتحليل مصادر تجميع رصيد المستخدم
CREATE OR REPLACE FUNCTION public.analyze_user_balance_sources(user_id_param UUID)
RETURNS TABLE(
  source_type TEXT,
  source_description TEXT,
  total_amount NUMERIC,
  transaction_count BIGINT,
  first_transaction TIMESTAMP WITH TIME ZONE,
  last_transaction TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- مصادر رصيد العملات (Coins)
  SELECT 
    'referral_rewards' as source_type,
    'مكافآت الإحالات' as source_description,
    COALESCE(SUM(ur.reward_amount), 0) as total_amount,
    COUNT(ur.id) as transaction_count,
    MIN(ur.created_at) as first_transaction,
    MAX(ur.created_at) as last_transaction
  FROM public.user_referrals ur
  WHERE ur.referrer_telegram_id = (
    SELECT telegram_id FROM public.telegram_users WHERE id = user_id_param
  )
  AND ur.reward_amount > 0
  
  UNION ALL
  
  -- مكافآت إكمال المهام
  SELECT 
    'task_completion' as source_type,
    'مكافآت إكمال المهام' as source_description,
    COALESCE(SUM(ct.reward_amount), 0) as total_amount,
    COUNT(ct.id) as transaction_count,
    MIN(ct.completed_at) as first_transaction,
    MAX(ct.completed_at) as last_transaction
  FROM public.completed_tasks ct
  WHERE ct.telegram_user_id = user_id_param
  
  UNION ALL
  
  -- تسجيل الدخول اليومي
  SELECT 
    'daily_login' as source_type,
    'تسجيل الدخول اليومي' as source_description,
    COALESCE(SUM(dl.reward_amount), 0) as total_amount,
    COUNT(dl.id) as transaction_count,
    MIN(dl.created_at) as first_transaction,
    MAX(dl.created_at) as last_transaction
  FROM public.daily_logins dl
  WHERE dl.telegram_user_id = user_id_param
  
  UNION ALL
  
  -- مصادر رصيد TON - الإيداعات المكتملة
  SELECT 
    'ton_deposits' as source_type,
    'إيداعات TON' as source_description,
    COALESCE(SUM(tp.ton_amount), 0) as total_amount,
    COUNT(tp.id) as transaction_count,
    MIN(tp.completed_at) as first_transaction,
    MAX(tp.completed_at) as last_transaction
  FROM public.ton_purchases tp
  WHERE tp.telegram_user_id = user_id_param
  AND tp.status = 'completed'
  AND tp.verified = true
  
  UNION ALL
  
  -- أرباح P2P - البيع
  SELECT 
    'p2p_sales' as source_type,
    'أرباح بيع P2P' as source_description,
    COALESCE(SUM(pt.ton_amount * 0.7), 0) as total_amount, -- خصم رسوم 30%
    COUNT(pt.id) as transaction_count,
    MIN(pt.created_at) as first_transaction,
    MAX(pt.created_at) as last_transaction
  FROM public.p2p_trades pt
  WHERE pt.seller_id = user_id_param
  AND pt.status = 'completed'
  
  UNION ALL
  
  -- مشتريات P2P - العملات المكتسبة
  SELECT 
    'p2p_purchases' as source_type,
    'عملات مشتراة من P2P' as source_description,
    COALESCE(SUM(pt.coin_amount), 0) as total_amount,
    COUNT(pt.id) as transaction_count,
    MIN(pt.created_at) as first_transaction,
    MAX(pt.created_at) as last_transaction
  FROM public.p2p_trades pt
  WHERE pt.buyer_id = user_id_param
  AND pt.status = 'completed'
  
  ORDER BY total_amount DESC;
END;
$$;

-- دالة لعرض ملخص شامل لرصيد المستخدم
CREATE OR REPLACE FUNCTION public.get_user_balance_summary(user_telegram_id_param BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  balance_sources RECORD;
  result JSON;
  sources_array JSON[] := '{}';
BEGIN
  -- الحصول على بيانات المستخدم
  SELECT * INTO user_record 
  FROM public.telegram_users 
  WHERE telegram_id = user_telegram_id_param;
  
  IF user_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;
  
  -- جمع مصادر الرصيد
  FOR balance_sources IN 
    SELECT * FROM public.analyze_user_balance_sources(user_record.id)
    WHERE total_amount > 0
  LOOP
    sources_array := sources_array || json_build_object(
      'source_type', balance_sources.source_type,
      'source_description', balance_sources.source_description,
      'total_amount', balance_sources.total_amount,
      'transaction_count', balance_sources.transaction_count,
      'first_transaction', balance_sources.first_transaction,
      'last_transaction', balance_sources.last_transaction
    );
  END LOOP;
  
  -- بناء النتيجة النهائية
  result := json_build_object(
    'success', true,
    'user_info', json_build_object(
      'telegram_id', user_record.telegram_id,
      'first_name', user_record.first_name,
      'username', user_record.username,
      'current_coins', user_record.coins,
      'current_ton_balance', user_record.ton_balance,
      'created_at', user_record.created_at,
      'last_active', user_record.last_active
    ),
    'balance_sources', sources_array,
    'analysis_date', NOW()
  );
  
  RETURN result;
END;
$$;

-- مثال على الاستخدام:
-- SELECT * FROM public.analyze_user_balance_sources('user-uuid-here');
-- SELECT public.get_user_balance_summary(138370);

COMMENT ON FUNCTION public.analyze_user_balance_sources(UUID) IS 'تحليل مصادر تجميع رصيد المستخدم';
COMMENT ON FUNCTION public.get_user_balance_summary(BIGINT) IS 'ملخص شامل لرصيد المستخدم ومصادر تجميعه';