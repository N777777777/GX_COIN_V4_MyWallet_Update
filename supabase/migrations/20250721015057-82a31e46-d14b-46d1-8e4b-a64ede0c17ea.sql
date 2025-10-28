-- إلغاء جميع العروض النشطة وإرجاع الأرصدة المجمدة

-- إرجاع الأرصدة المجمدة للمستخدمين
UPDATE public.telegram_users 
SET coins = coins + fb.amount
FROM public.frozen_balances fb
INNER JOIN public.p2p_orders po ON fb.order_id = po.id
WHERE telegram_users.id = fb.user_id 
AND fb.balance_type = 'coins'
AND po.status IN ('active', 'partially_filled');

UPDATE public.telegram_users 
SET ton_balance = ton_balance + fb.amount
FROM public.frozen_balances fb
INNER JOIN public.p2p_orders po ON fb.order_id = po.id
WHERE telegram_users.id = fb.user_id 
AND fb.balance_type = 'ton'
AND po.status IN ('active', 'partially_filled');

-- حذف جميع الأرصدة المجمدة
DELETE FROM public.frozen_balances 
WHERE order_id IN (
  SELECT id FROM public.p2p_orders 
  WHERE status IN ('active', 'partially_filled')
);

-- تحديث حالة جميع العروض النشطة إلى ملغاة
UPDATE public.p2p_orders 
SET status = 'cancelled', 
    updated_at = now()
WHERE status IN ('active', 'partially_filled');