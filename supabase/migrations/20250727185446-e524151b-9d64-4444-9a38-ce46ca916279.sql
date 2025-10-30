-- إزالة جميع الإحالات وإلغاء ربط أكواد الإحالة

-- 1. حذف جميع الإحالات
DELETE FROM public.user_referrals;

-- 2. إلغاء ربط أكواد الإحالة من جميع المستخدمين
UPDATE public.telegram_users 
SET 
    referrer_telegram_id = NULL,
    total_referrals_count = 0,
    total_referral_earnings = 0,
    referral_tier = 'bronze';

-- 3. حذف جميع أرباح الإحالات
DELETE FROM public.referral_earnings;