-- Fix the get_active_partner_tasks function to properly return partner tasks
CREATE OR REPLACE FUNCTION public.get_active_partner_tasks()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  tasks_array JSON[];
  task_record RECORD;
BEGIN
  tasks_array := '{}';
  
  FOR task_record IN 
    SELECT 
      pt.*,
      tu.first_name as creator_name,
      tu.username as creator_username
    FROM public.partner_tasks pt
    LEFT JOIN public.telegram_users tu ON pt.created_by = tu.id
    WHERE pt.is_active = true 
    AND (pt.end_date IS NULL OR pt.end_date > now())
    ORDER BY pt.created_at DESC
  LOOP
    tasks_array := tasks_array || json_build_object(
      'id', task_record.id,
      'title', task_record.title,
      'description', task_record.description,
      'reward_amount', task_record.reward_amount,
      'task_url', task_record.task_url,
      'max_participants', task_record.max_participants,
      'current_participants', task_record.current_participants,
      'start_date', task_record.start_date,
      'end_date', task_record.end_date,
      'partner_name', task_record.partner_name,
      'partner_logo_url', task_record.partner_logo_url,
      'creator_name', task_record.creator_name,
      'created_at', task_record.created_at,
      'is_active', task_record.is_active
    );
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'tasks', tasks_array,
    'count', COALESCE(array_length(tasks_array, 1), 0)
  );
END;
$function$