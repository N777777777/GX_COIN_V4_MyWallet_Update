-- Clean up old cron jobs and ensure proper setup
DO $$
BEGIN
    -- Try to unschedule old jobs if they exist
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ton-payment-verification') THEN
        PERFORM cron.unschedule('ton-payment-verification');
    END IF;
    
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ton-deposit-verification-5min') THEN
        PERFORM cron.unschedule('ton-deposit-verification-5min');
    END IF;
END $$;

-- Create the new 5-minute verification job
SELECT cron.schedule(
  'ton-deposit-verification-5min',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://yyjxkogzsqiekbawwhgf.supabase.co/functions/v1/verify-ton-deposits',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5anhrb2d6c3FpZWtiYXd3aGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTM1NTgsImV4cCI6MjA2ODM4OTU1OH0.8hJxRD86Lhc-4PAOXjXVWWCLHGWqY3Mu9U6lHo0IxPc"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);