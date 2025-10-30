-- إلغاء المهام الاجتماعية
-- 1. إلغاء تفعيل المهام الاجتماعية في جدول المهام الافتراضية
UPDATE public.default_tasks 
SET is_active = false, updated_at = now()
WHERE task_type = 'social';

-- 2. إلغاء المهام المنشأة من المستخدمين ذات النوع الاجتماعي
UPDATE public.user_created_tasks 
SET status = 'cancelled', updated_at = now()
WHERE task_type = 'social' AND status = 'active';