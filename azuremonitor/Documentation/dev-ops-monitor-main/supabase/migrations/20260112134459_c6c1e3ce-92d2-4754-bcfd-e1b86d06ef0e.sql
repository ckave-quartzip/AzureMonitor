-- Function to get all Azure sync cron jobs
CREATE OR REPLACE FUNCTION public.get_azure_sync_cron_jobs()
RETURNS TABLE(
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
SET search_path TO 'public'
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
  WHERE j.jobname IN ('azure-sync-resources', 'azure-sync-costs', 'azure-sync-metrics');
END;
$$;

-- Function to upsert (create or update) Azure sync cron jobs
CREATE OR REPLACE FUNCTION public.upsert_azure_sync_cron_job(
  p_job_name text,
  p_schedule text,
  p_is_active boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_job_id bigint;
  v_function_url text;
  v_anon_key text;
  v_command text;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Validate job name
  IF p_job_name NOT IN ('azure-sync-resources', 'azure-sync-costs', 'azure-sync-metrics') THEN
    RAISE EXCEPTION 'Invalid job name: %', p_job_name;
  END IF;

  -- Build the function URL and command
  v_function_url := 'https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/' || p_job_name;
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWhrdHN2aGF6ZWxqbm5jbmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE1ODYsImV4cCI6MjA4MzM4NzU4Nn0.wklfXGrCWskPScr-Cxd2E9H54Pr-ufXS_LtHM35NT58';
  
  v_command := format(
    'SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:=''{"time": "'' || now() || ''"}''::jsonb) as request_id;',
    v_function_url,
    '{"Content-Type": "application/json", "Authorization": "Bearer ' || v_anon_key || '"}'
  );

  -- Check if job exists
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = p_job_name;

  IF v_job_id IS NOT NULL THEN
    -- Update existing job
    PERFORM cron.alter_job(v_job_id, schedule := p_schedule);
    
    UPDATE cron.job
    SET active = p_is_active
    WHERE jobid = v_job_id;
  ELSE
    -- Create new job
    PERFORM cron.schedule(p_job_name, p_schedule, v_command);
    
    -- Update active status if disabled
    IF NOT p_is_active THEN
      UPDATE cron.job
      SET active = false
      WHERE jobname = p_job_name;
    END IF;
  END IF;
END;
$$;