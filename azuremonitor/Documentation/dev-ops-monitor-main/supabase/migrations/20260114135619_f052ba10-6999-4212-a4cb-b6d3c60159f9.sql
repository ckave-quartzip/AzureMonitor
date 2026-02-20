-- Mark the current stuck job as failed
UPDATE azure_sync_logs 
SET 
  status = 'failed',
  completed_at = NOW(),
  error_message = 'Job timed out or was interrupted - edge function timeout exceeded'
WHERE id = 'd7d0861c-a965-4f39-9c47-402ae95b6fad';

-- Create a function to auto-cleanup stuck sync jobs (jobs running for more than 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_stuck_sync_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  UPDATE azure_sync_logs 
  SET 
    status = 'failed',
    completed_at = NOW(),
    error_message = 'Auto-cleanup: Job exceeded maximum runtime of 10 minutes'
  WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '10 minutes';
  
  GET DIAGNOSTICS cleaned_count = ROW_COUNT;
  RETURN cleaned_count;
END;
$$;