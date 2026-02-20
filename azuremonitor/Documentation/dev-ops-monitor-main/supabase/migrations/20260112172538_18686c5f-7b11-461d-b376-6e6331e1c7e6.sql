-- Add unique constraint to azure_cost_data for upsert operations
-- This prevents duplicates during historical syncs and allows re-syncing
ALTER TABLE azure_cost_data 
ADD CONSTRAINT azure_cost_data_unique_record 
UNIQUE NULLS NOT DISTINCT (azure_tenant_id, azure_resource_id, usage_date, meter_category, meter_subcategory, meter_name);

-- Add unique constraint to azure_metrics for upsert operations
ALTER TABLE azure_metrics 
ADD CONSTRAINT azure_metrics_unique_record 
UNIQUE (azure_resource_id, metric_name, timestamp_utc);

-- Create table to track long-running sync progress
CREATE TABLE azure_sync_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES azure_tenants(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'costs', 'metrics', 'sql-insights', 'resources'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  start_date DATE,
  end_date DATE,
  total_chunks INT DEFAULT 0,
  completed_chunks INT DEFAULT 0,
  records_synced INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on sync_progress table
ALTER TABLE azure_sync_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users with any role can view sync progress
CREATE POLICY "Users with roles can view sync progress"
ON azure_sync_progress
FOR SELECT
USING (public.has_any_role(auth.uid()));

-- Policy: Admins can insert/update/delete sync progress
CREATE POLICY "Admins can manage sync progress"
ON azure_sync_progress
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add index for quick lookups
CREATE INDEX idx_azure_sync_progress_tenant_status 
ON azure_sync_progress(tenant_id, status);

CREATE INDEX idx_azure_sync_progress_created_at 
ON azure_sync_progress(created_at DESC);