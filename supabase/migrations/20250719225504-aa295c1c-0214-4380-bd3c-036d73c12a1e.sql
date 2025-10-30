-- إنشاء cron job للتحقق من السحوبات المنتهية كل دقيقة
select
cron.schedule(
  'complete-expired-draws',
  '* * * * *', -- كل دقيقة
  $$
  select
    net.http_post(
        url:='https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/complete-expired-draws',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5anhrb2d6c3FpZWtiYXd3aGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTM1NTgsImV4cCI6MjA2ODM4OTU1OH0.8hJxRD86Lhc-4PAOXjXVWWCLHGWqY3Mu9U6lHo0IxPc"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);