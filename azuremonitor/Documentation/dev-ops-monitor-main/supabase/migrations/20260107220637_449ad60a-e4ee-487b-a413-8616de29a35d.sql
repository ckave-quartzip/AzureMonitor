-- Enable required extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the execute-checks function to run every minute
SELECT cron.schedule(
  'run-monitoring-checks',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/execute-checks',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWhrdHN2aGF6ZWxqbm5jbmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE1ODYsImV4cCI6MjA4MzM4NzU4Nn0.wklfXGrCWskPScr-Cxd2E9H54Pr-ufXS_LtHM35NT58"}'::jsonb,
    body := concat('{"scheduled": true, "time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);