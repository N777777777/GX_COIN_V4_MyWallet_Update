-- حذف مهمة KuCoin المكررة التي تعطي 10 فقط
DELETE FROM public.default_tasks 
WHERE task_id = 'kucoin_register';