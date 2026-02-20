-- Create function to get the monitoring cron job
CREATE OR REPLACE FUNCTION public.get_monitoring_cron_job()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  WHERE j.jobname = 'run-monitoring-checks';
END;
$$;

-- Create function to update the monitoring cron job
CREATE OR REPLACE FUNCTION public.update_monitoring_cron_job(
  new_schedule text,
  is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_id bigint;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Get the job id
  SELECT jobid INTO job_id
  FROM cron.job
  WHERE jobname = 'run-monitoring-checks';

  IF job_id IS NULL THEN
    RAISE EXCEPTION 'Monitoring cron job not found';
  END IF;

  -- Update the schedule
  PERFORM cron.alter_job(
    job_id,
    schedule := new_schedule
  );

  -- Update active status
  UPDATE cron.job
  SET active = is_active
  WHERE jobid = job_id;
END;
$$;