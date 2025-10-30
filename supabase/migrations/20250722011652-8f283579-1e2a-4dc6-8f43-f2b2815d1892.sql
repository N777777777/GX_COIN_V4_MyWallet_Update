-- إنشاء RLS policy جديد للسماح لصاحب المهمة بتحديثها
DROP POLICY IF EXISTS "Task creators can update their own tasks" ON public.user_created_tasks;

CREATE POLICY "Task creators can update their own tasks" ON public.user_created_tasks
FOR UPDATE USING (
  creator_telegram_id = (
    SELECT CAST(current_setting('app.current_user_telegram_id', true) AS bigint)
  )
) WITH CHECK (
  creator_telegram_id = (
    SELECT CAST(current_setting('app.current_user_telegram_id', true) AS bigint)
  )
);