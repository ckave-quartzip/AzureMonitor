-- Use cron.unschedule and cron.schedule to recreate jobs with timeout
-- First unschedule existing jobs
SELECT cron.unschedule('azure-sync-resources');
SELECT cron.unschedule('azure-sync-costs');
SELECT cron.unschedule('azure-sync-metrics');
SELECT cron.unschedule('azure-sync-sql-insights');

-- Recreate with 120-second timeout
SELECT cron.schedule(
  'azure-sync-resources',
  '0 */4 * * *',
  $$SELECT net.http_post(url:='https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/azure-sync-resources', headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWhrdHN2aGF6ZWxqbm5jbmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE1ODYsImV4cCI6MjA4MzM4NzU4Nn0.wklfXGrCWskPScr-Cxd2E9H54Pr-ufXS_LtHM35NT58"}'::jsonb, body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb, timeout_milliseconds:=120000) as request_id;$$
);

SELECT cron.schedule(
  'azure-sync-costs',
  '0 * * * *',
  $$SELECT net.http_post(url:='https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/azure-sync-costs', headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWhrdHN2aGF6ZWxqbm5jbmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE1ODYsImV4cCI6MjA4MzM4NzU4Nn0.wklfXGrCWskPScr-Cxd2E9H54Pr-ufXS_LtHM35NT58"}'::jsonb, body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb, timeout_milliseconds:=120000) as request_id;$$
);

SELECT cron.schedule(
  'azure-sync-metrics',
  '0 * * * *',
  $$SELECT net.http_post(url:='https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/azure-sync-metrics', headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWhrdHN2aGF6ZWxqbm5jbmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE1ODYsImV4cCI6MjA4MzM4NzU4Nn0.wklfXGrCWskPScr-Cxd2E9H54Pr-ufXS_LtHM35NT58"}'::jsonb, body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb, timeout_milliseconds:=120000) as request_id;$$
);

SELECT cron.schedule(
  'azure-sync-sql-insights',
  '0 * * * *',
  $$SELECT net.http_post(url:='https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/azure-sync-sql-insights', headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWhrdHN2aGF6ZWxqbm5jbmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE1ODYsImV4cCI6MjA4MzM4NzU4Nn0.wklfXGrCWskPScr-Cxd2E9H54Pr-ufXS_LtHM35NT58"}'::jsonb, body:=concat('{"scheduled": true, "time": "', now(), '"}')::jsonb, timeout_milliseconds:=120000) as request_id;$$
);