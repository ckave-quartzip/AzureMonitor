-- Create table for Log Analytics workspace configuration
CREATE TABLE public.log_analytics_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_tenant_id UUID REFERENCES public.azure_tenants(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(azure_tenant_id, workspace_id)
);

-- Create table for SQL wait statistics
CREATE TABLE public.azure_sql_wait_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_resource_id UUID REFERENCES public.azure_resources(id) ON DELETE CASCADE,
  wait_type TEXT NOT NULL,
  wait_time_ms DECIMAL(18,2),
  wait_count BIGINT,
  avg_wait_time_ms DECIMAL(18,2),
  max_wait_time_ms DECIMAL(18,2),
  collected_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.log_analytics_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_sql_wait_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for log_analytics_workspaces
CREATE POLICY "Users with any role can view log analytics workspaces"
  ON public.log_analytics_workspaces FOR SELECT
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins can insert log analytics workspaces"
  ON public.log_analytics_workspaces FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update log analytics workspaces"
  ON public.log_analytics_workspaces FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete log analytics workspaces"
  ON public.log_analytics_workspaces FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for azure_sql_wait_stats
CREATE POLICY "Users with any role can view wait stats"
  ON public.azure_sql_wait_stats FOR SELECT
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Service role can manage wait stats"
  ON public.azure_sql_wait_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_wait_stats_resource_collected ON public.azure_sql_wait_stats(azure_resource_id, collected_at DESC);
CREATE INDEX idx_wait_stats_wait_type ON public.azure_sql_wait_stats(wait_type);
CREATE INDEX idx_log_analytics_tenant ON public.log_analytics_workspaces(azure_tenant_id);

-- Update trigger for log_analytics_workspaces
CREATE TRIGGER update_log_analytics_workspaces_updated_at
  BEFORE UPDATE ON public.log_analytics_workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Update DB function for cron jobs to include SQL insights
CREATE OR REPLACE FUNCTION public.get_azure_sync_cron_jobs()
 RETURNS TABLE(jobid bigint, schedule text, command text, nodename text, nodeport integer, database text, username text, active boolean, jobname text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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
  WHERE j.jobname IN ('azure-sync-resources', 'azure-sync-costs', 'azure-sync-metrics', 'azure-sync-sql-insights');
END;
$function$;

-- Update upsert function to include SQL insights job
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
  
  v_command := format(
    'SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:=''{"time": "'' || now() || ''"}''::jsonb) as request_id;',
    v_function_url,
    '{"Content-Type": "application/json", "Authorization": "Bearer ' || v_anon_key || '"}'
  );

  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = p_job_name;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.alter_job(v_job_id, schedule := p_schedule);
    
    UPDATE cron.job
    SET active = p_is_active
    WHERE jobid = v_job_id;
  ELSE
    PERFORM cron.schedule(p_job_name, p_schedule, v_command);
    
    IF NOT p_is_active THEN
      UPDATE cron.job
      SET active = false
      WHERE jobname = p_job_name;
    END IF;
  END IF;
END;
$function$;