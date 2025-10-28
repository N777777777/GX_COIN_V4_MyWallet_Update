-- تفعيل RLS للجدول الجديد
ALTER TABLE public.current_state_backup_emergency ENABLE ROW LEVEL SECURITY;

-- إضافة سياسة للمدير فقط
CREATE POLICY "Service role can manage emergency backup" ON public.current_state_backup_emergency
  FOR ALL USING (auth.role() = 'service_role');