-- حذف الـ trigger الذي يسبب إضافة عمولات تلقائياً بشكل خاطئ
DROP TRIGGER IF EXISTS trigger_auto_referral_commissions ON telegram_users;

-- حذف الدالة المرتبطة بالـ trigger
DROP FUNCTION IF EXISTS public.auto_process_referral_commissions();