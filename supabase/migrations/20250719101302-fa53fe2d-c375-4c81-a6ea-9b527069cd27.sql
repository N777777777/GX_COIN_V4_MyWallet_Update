-- تمكين pg_cron extension للمهام المجدولة
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- تمكين pg_net extension لطلبات HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- إنشاء cron job للتحقق من مدفوعات TON كل دقيقة
SELECT cron.schedule(
  'ton-payment-verification',
  '* * * * *', -- كل دقيقة
  $$
  SELECT
    net.http_post(
        url:='https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/ton-payment-verification',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5anhrb2d6c3FpZWtiYXd3aGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTM1NTgsImV4cCI6MjA2ODM4OTU1OH0.8hJxRD86Lhc-4PAOXjXVWWCLHGWqY3Mu9U6lHo0IxPc"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);