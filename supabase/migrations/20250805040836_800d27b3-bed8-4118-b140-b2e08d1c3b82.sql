-- تفعيل امتدادات Cron و HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- حذف أي مهام سابقة بنفس الاسم (إذا وجدت)
SELECT cron.unschedule('daily_stars_draw') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily_stars_draw'
);

-- إنشاء مهمة Cron للسحب اليومي في الساعة 00:00 UTC كل يوم
SELECT cron.schedule(
  'daily_stars_draw',
  '0 0 * * *', -- كل يوم في منتصف الليل UTC
  $$
  SELECT net.http_post(
    url := 'https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/daily-stars-draw',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5anhrb2d6c3FpZWtiYXd3aGdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjgxMzU1OCwiZXhwIjoyMDY4Mzg5NTU4fQ.0ZPCMrSBGJQ8JhQhAayb04Yt-2a6Mw8Mg7aOy9o5jVE"}'::jsonb,
    body := '{"automated": true}'::jsonb
  );
  $$
);