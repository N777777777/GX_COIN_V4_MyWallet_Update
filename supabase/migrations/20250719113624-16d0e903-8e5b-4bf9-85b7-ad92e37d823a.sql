-- تنظيف المشروع من الـ scripts القديمة والـ jobs غير المستخدمة

-- حذف cron jobs قديمة إذا كانت موجودة
SELECT cron.unschedule('ton-payment-verification') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'ton-payment-verification'
);

-- تنظيف أي functions قديمة غير مستخدمة (إذا كانت موجودة)
DROP FUNCTION IF EXISTS public.verify_ton_payment();
DROP FUNCTION IF EXISTS public.check_ton_transactions();

-- التأكد من أن جميع الـ indexes مُحسَّنة
ANALYZE public.pending_tasks;
ANALYZE public.completed_tasks;
ANALYZE public.telegram_users;