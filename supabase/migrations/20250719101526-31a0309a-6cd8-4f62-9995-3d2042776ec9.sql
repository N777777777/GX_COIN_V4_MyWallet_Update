-- إلغاء cron job للتحقق من مدفوعات TON
SELECT cron.unschedule('ton-payment-verification');

-- حذف مهمة دفع TON من المهام الافتراضية
DELETE FROM public.default_tasks WHERE task_id = 'ton_payment_1';

-- حذف أي مهام معلقة متعلقة بـ TON
DELETE FROM public.pending_tasks WHERE task_id = 'ton_payment_1';

-- حذف أي مهام مكتملة متعلقة بـ TON
DELETE FROM public.completed_tasks WHERE task_id = 'ton_payment_1';