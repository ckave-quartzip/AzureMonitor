-- Clean up stuck sync jobs by marking them as failed
UPDATE azure_sync_logs 
SET 
  status = 'failed',
  completed_at = NOW(),
  error_message = 'Job timed out or was interrupted - manually marked as failed'
WHERE status = 'running' 
AND started_at < NOW() - INTERVAL '10 minutes';