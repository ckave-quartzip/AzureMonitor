-- Fix the upsert_azure_sync_cron_job function to use concat() for proper JSON body construction
CREATE OR REPLACE FUNCTION public.upsert_azure_sync_cron_job(p_job_name text, p_schedule text, p_is_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_job_id bigint;
  v_function_url text;
  v_anon_key text;
  v_command text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_job_name NOT IN ('azure-sync-resources', 'azure-sync-costs', 'azure-sync-metrics', 'azure-sync-sql-insights') THEN
    RAISE EXCEPTION 'Invalid job name: %', p_job_name;
  END IF;

  v_function_url := 'https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/' || p_job_name;
  v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprcWhrdHN2aGF6ZWxqbm5jbmNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE1ODYsImV4cCI6MjA4MzM4NzU4Nn0.wklfXGrCWskPScr-Cxd2E9H54Pr-ufXS_LtHM35NT58';
  
  -- Use concat() for proper JSON body construction (fixes invalid JSON syntax error)
  v_command := format(
    'SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:=concat(''{"scheduled": true, "time": "'', now(), ''"}'')::jsonb) as request_id;',
    v_function_url,
    '{"Content-Type": "application/json", "Authorization": "Bearer ' || v_anon_key || '"}'
  );

  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = p_job_name;

  IF v_job_id IS NOT NULL THEN
    -- Delete and recreate to update the command
    PERFORM cron.unschedule(v_job_id);
  END IF;
  
  -- Create job with new command
  PERFORM cron.schedule(p_job_name, p_schedule, v_command);
  
  -- Update active status if disabled
  IF NOT p_is_active THEN
    UPDATE cron.job
    SET active = false
    WHERE jobname = p_job_name;
  END IF;
END;
$function$;