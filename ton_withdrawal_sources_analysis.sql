-- سكربت SQL لتحليل مصادر التون للمستخدمين الذين قاموا بالسحب
-- TON Withdrawal Sources Analysis Script

-- ==================================================
-- 1. تقرير شامل لمصادر التون للمستخدمين الذين سحبوا
-- ==================================================

WITH withdrawal_users AS (
  -- المستخدمون الذين قاموا بالسحب (معلق أو مكتمل)
  SELECT DISTINCT 
    tu.id as user_id,
    tu.telegram_id,
    tu.first_name,
    tu.username,
    tu.ton_balance as current_ton_balance
  FROM telegram_users tu
  WHERE tu.id IN (
    SELECT DISTINCT telegram_user_id FROM pending_ton_withdrawals
    UNION
    SELECT DISTINCT telegram_user_id FROM completed_ton_withdrawals
  )
),

ton_sources AS (
  -- مصادر التون لكل مستخدم
  SELECT 
    wu.user_id,
    wu.telegram_id,
    wu.first_name,
    wu.username,
    wu.current_ton_balance,
    
    -- إيداعات التون المؤكدة
    COALESCE(deposits.total_deposited, 0) as total_deposited,
    COALESCE(deposits.deposit_count, 0) as deposit_transactions,
    
    -- أرباح من بيع العملات في P2P (البائع يحصل على TON)
    COALESCE(p2p_sales.total_earned_from_sales, 0) as total_earned_from_p2p_sales,
    COALESCE(p2p_sales.sales_count, 0) as p2p_sales_count,
    
    -- مشتريات التون العامة
    COALESCE(purchases.total_purchased, 0) as total_purchased,
    COALESCE(purchases.purchase_count, 0) as purchase_transactions
    
  FROM withdrawal_users wu
  
  -- إيداعات التون
  LEFT JOIN (
    SELECT 
      tp.telegram_user_id,
      SUM(tp.ton_amount) as total_deposited,
      COUNT(*) as deposit_count
    FROM ton_purchases tp
    WHERE tp.status = 'completed' 
    AND tp.verified = true
    GROUP BY tp.telegram_user_id
  ) deposits ON wu.user_id = deposits.telegram_user_id
  
  -- أرباح P2P من البيع
  LEFT JOIN (
    SELECT 
      pt.seller_id,
      SUM(pt.ton_amount * 0.7) as total_earned_from_sales, -- خصم رسوم 30%
      COUNT(*) as sales_count
    FROM p2p_trades pt
    WHERE pt.status = 'completed'
    GROUP BY pt.seller_id
  ) p2p_sales ON wu.user_id = p2p_sales.seller_id
  
  -- مشتريات التون العامة
  LEFT JOIN (
    SELECT 
      tp.telegram_user_id,
      SUM(tp.ton_amount) as total_purchased,
      COUNT(*) as purchase_count
    FROM ton_purchases tp
    WHERE tp.status = 'completed'
    GROUP BY tp.telegram_user_id
  ) purchases ON wu.user_id = purchases.telegram_user_id
),

withdrawal_summary AS (
  -- ملخص السحوبات لكل مستخدم
  SELECT 
    telegram_user_id,
    SUM(amount) as total_withdrawn,
    COUNT(*) as withdrawal_count
  FROM (
    SELECT telegram_user_id, amount FROM pending_ton_withdrawals
    UNION ALL
    SELECT telegram_user_id, amount FROM completed_ton_withdrawals
  ) all_withdrawals
  GROUP BY telegram_user_id
)

-- التقرير النهائي
SELECT 
  ts.telegram_id,
  ts.first_name,
  ts.username,
  ts.current_ton_balance,
  
  -- مصادر التون
  ts.total_deposited,
  ts.deposit_transactions,
  ts.total_earned_from_p2p_sales,
  ts.p2p_sales_count,
  ts.total_purchased,
  ts.purchase_transactions,
  
  -- إجمالي التون المكتسب
  (ts.total_deposited + ts.total_earned_from_p2p_sales + ts.total_purchased) as total_ton_acquired,
  
  -- السحوبات
  ws.total_withdrawn,
  ws.withdrawal_count,
  
  -- تحليل الرصيد
  (ts.current_ton_balance + ws.total_withdrawn) as expected_total_ton,
  (ts.total_deposited + ts.total_earned_from_p2p_sales + ts.total_purchased) - (ts.current_ton_balance + ws.total_withdrawn) as balance_difference
  
FROM ton_sources ts
LEFT JOIN withdrawal_summary ws ON ts.user_id = ws.telegram_user_id
ORDER BY ws.total_withdrawn DESC;

-- ==================================================
-- 2. تفاصيل مصادر التون لمستخدم محدد
-- ==================================================

-- استبدل TELEGRAM_USER_ID بالرقم المطلوب
/*
WITH target_user AS (
  SELECT id FROM telegram_users WHERE telegram_id = TELEGRAM_USER_ID
)

SELECT 
  'إيداعات TON' as source_type,
  tp.ton_amount as amount,
  tp.transaction_hash,
  tp.completed_at as transaction_date,
  'مؤكد' as status
FROM ton_purchases tp, target_user tu
WHERE tp.telegram_user_id = tu.id
AND tp.status = 'completed'
AND tp.verified = true

UNION ALL

SELECT 
  'أرباح P2P (بيع عملات)' as source_type,
  (pt.ton_amount * 0.7) as amount, -- بعد خصم الرسوم
  NULL as transaction_hash,
  pt.created_at as transaction_date,
  pt.status
FROM p2p_trades pt, target_user tu
WHERE pt.seller_id = tu.id
AND pt.status = 'completed'

ORDER BY transaction_date DESC;
*/

-- ==================================================
-- 3. المستخدمون الذين سحبوا أكثر مما أودعوا (مشبوه)
-- ==================================================

SELECT 
  tu.telegram_id,
  tu.first_name,
  tu.username,
  
  -- إجمالي الإيداعات
  COALESCE(deposits.total_deposited, 0) as total_deposited,
  
  -- إجمالي السحوبات
  COALESCE(withdrawals.total_withdrawn, 0) as total_withdrawn,
  
  -- الفرق (إذا كان سالب = سحب أكثر من الإيداع)
  COALESCE(deposits.total_deposited, 0) - COALESCE(withdrawals.total_withdrawn, 0) as balance_difference,
  
  -- الرصيد الحالي
  tu.ton_balance as current_balance

FROM telegram_users tu

-- إجمالي الإيداعات
LEFT JOIN (
  SELECT 
    telegram_user_id,
    SUM(ton_amount) as total_deposited
  FROM ton_purchases
  WHERE status = 'completed' AND verified = true
  GROUP BY telegram_user_id
) deposits ON tu.id = deposits.telegram_user_id

-- إجمالي السحوبات
LEFT JOIN (
  SELECT 
    telegram_user_id,
    SUM(amount) as total_withdrawn
  FROM (
    SELECT telegram_user_id, amount FROM pending_ton_withdrawals
    UNION ALL
    SELECT telegram_user_id, amount FROM completed_ton_withdrawals
  ) all_withdrawals
  GROUP BY telegram_user_id
) withdrawals ON tu.id = withdrawals.telegram_user_id

-- فقط المستخدمين الذين لديهم سحوبات
WHERE withdrawals.total_withdrawn > 0
-- والذين سحبوا أكثر مما أودعوا (مع هامش للأرباح من P2P)
AND (COALESCE(deposits.total_deposited, 0) - COALESCE(withdrawals.total_withdrawn, 0)) < -1

ORDER BY balance_difference ASC;

-- ==================================================
-- 4. ملخص إحصائي عام
-- ==================================================

SELECT 
  'إجمالي المستخدمين الذين سحبوا' as metric,
  COUNT(DISTINCT telegram_user_id) as value
FROM (
  SELECT telegram_user_id FROM pending_ton_withdrawals
  UNION
  SELECT telegram_user_id FROM completed_ton_withdrawals
) all_withdrawals

UNION ALL

SELECT 
  'إجمالي مبلغ السحوبات المعلقة' as metric,
  ROUND(SUM(amount), 4) as value
FROM pending_ton_withdrawals

UNION ALL

SELECT 
  'إجمالي مبلغ السحوبات المكتملة' as metric,
  ROUND(SUM(amount), 4) as value
FROM completed_ton_withdrawals

UNION ALL

SELECT 
  'إجمالي الإيداعات المؤكدة' as metric,
  ROUND(SUM(ton_amount), 4) as value
FROM ton_purchases
WHERE status = 'completed' AND verified = true;