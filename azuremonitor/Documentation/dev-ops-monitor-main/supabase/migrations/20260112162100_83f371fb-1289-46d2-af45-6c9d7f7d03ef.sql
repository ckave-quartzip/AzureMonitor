-- Add storage columns to azure_sql_performance_stats
ALTER TABLE azure_sql_performance_stats 
ADD COLUMN IF NOT EXISTS data_space_used_bytes BIGINT,
ADD COLUMN IF NOT EXISTS data_space_allocated_bytes BIGINT,
ADD COLUMN IF NOT EXISTS log_space_used_bytes BIGINT,
ADD COLUMN IF NOT EXISTS log_space_used_percent DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS max_size_bytes BIGINT;

-- Create index for efficient storage trend queries
CREATE INDEX IF NOT EXISTS idx_sql_perf_stats_storage_trend 
ON azure_sql_performance_stats (azure_resource_id, timestamp_utc DESC);

-- Create table for geo-replication links
CREATE TABLE IF NOT EXISTS azure_sql_replication_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_resource_id UUID NOT NULL REFERENCES azure_resources(id) ON DELETE CASCADE,
  link_id TEXT NOT NULL,
  partner_server TEXT NOT NULL,
  partner_database TEXT NOT NULL,
  partner_location TEXT,
  role TEXT, -- 'Primary' or 'Secondary'
  replication_mode TEXT, -- 'ASYNC' or 'SYNC'
  replication_state TEXT, -- 'CATCH_UP', 'SEEDING', 'SUSPENDED', 'PENDING'
  percent_complete INTEGER,
  replication_lag_seconds INTEGER,
  last_replicated_time TIMESTAMPTZ,
  is_termination_allowed BOOLEAN,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (azure_resource_id, link_id)
);

-- Create index for replication links
CREATE INDEX IF NOT EXISTS idx_replication_links_resource 
ON azure_sql_replication_links(azure_resource_id);

-- Enable RLS on replication links
ALTER TABLE azure_sql_replication_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for replication links (same pattern as other azure tables)
CREATE POLICY "Users with any role can view replication links"
ON azure_sql_replication_links FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can insert replication links"
ON azure_sql_replication_links FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can update replication links"
ON azure_sql_replication_links FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete replication links"
ON azure_sql_replication_links FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create table for replication lag history
CREATE TABLE IF NOT EXISTS azure_sql_replication_lag_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replication_link_id UUID NOT NULL REFERENCES azure_sql_replication_links(id) ON DELETE CASCADE,
  lag_seconds INTEGER,
  replication_state TEXT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for lag history queries
CREATE INDEX IF NOT EXISTS idx_replication_lag_history 
ON azure_sql_replication_lag_history(replication_link_id, recorded_at DESC);

-- Enable RLS on lag history
ALTER TABLE azure_sql_replication_lag_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for lag history
CREATE POLICY "Users with any role can view lag history"
ON azure_sql_replication_lag_history FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can insert lag history"
ON azure_sql_replication_lag_history FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete lag history"
ON azure_sql_replication_lag_history FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));