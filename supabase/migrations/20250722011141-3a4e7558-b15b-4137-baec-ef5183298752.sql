-- إصلاح policies موجودة مسبقاً
DROP POLICY IF EXISTS "Enable update for all users" ON public.telegram_users;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.user_created_tasks;
DROP POLICY IF EXISTS "Users can insert their own completed tasks" ON public.completed_tasks;
DROP POLICY IF EXISTS "Anyone can update tasks" ON public.user_created_tasks;

-- إنشاء policies جديدة
CREATE POLICY "Enable update for all users" ON public.telegram_users
FOR UPDATE USING (true);

CREATE POLICY "Users can insert their own completed tasks" ON public.completed_tasks
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update tasks" ON public.user_created_tasks
FOR UPDATE USING (true);