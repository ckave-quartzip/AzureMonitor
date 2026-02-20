-- Remove the duplicate cron job (execute-monitoring-checks)
-- Keep only run-monitoring-checks which is used by the SchedulerSettings admin UI
SELECT cron.unschedule(1);