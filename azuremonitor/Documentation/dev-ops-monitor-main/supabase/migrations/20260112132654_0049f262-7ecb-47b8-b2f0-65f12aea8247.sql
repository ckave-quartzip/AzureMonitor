-- =============================================
-- Phase 1: Azure Integration Database Schema
-- =============================================

-- 1. Create azure_tenants table for storing Azure connection configurations
CREATE TABLE public.azure_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  client_secret_id UUID NULL, -- Reference to vault secret
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create azure_resources table for caching Azure resources
CREATE TABLE public.azure_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_tenant_id UUID NOT NULL REFERENCES public.azure_tenants(id) ON DELETE CASCADE,
  azure_resource_id TEXT NOT NULL, -- Full Azure resource ID
  resource_group TEXT NOT NULL,
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- e.g., Microsoft.Web/sites, Microsoft.Sql/servers
  location TEXT NOT NULL,
  tags JSONB NULL DEFAULT '{}',
  properties JSONB NULL DEFAULT '{}',
  sku JSONB NULL,
  kind TEXT NULL,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(azure_tenant_id, azure_resource_id)
);

-- 3. Create azure_cost_data table for storing cost/billing data
CREATE TABLE public.azure_cost_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_tenant_id UUID NOT NULL REFERENCES public.azure_tenants(id) ON DELETE CASCADE,
  azure_resource_id TEXT NULL, -- NULL for subscription-level costs
  resource_group TEXT NULL,
  meter_category TEXT NULL,
  meter_subcategory TEXT NULL,
  meter_name TEXT NULL,
  cost_amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  usage_quantity DECIMAL(18, 6) NULL,
  usage_unit TEXT NULL,
  usage_date DATE NOT NULL,
  billing_period TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create azure_metrics table for storing performance metrics
CREATE TABLE public.azure_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_resource_id UUID NOT NULL REFERENCES public.azure_resources(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_namespace TEXT NOT NULL,
  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  average DECIMAL(18, 6) NULL,
  minimum DECIMAL(18, 6) NULL,
  maximum DECIMAL(18, 6) NULL,
  total DECIMAL(18, 6) NULL,
  count BIGINT NULL,
  unit TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create azure_sql_insights table for SQL query analysis
CREATE TABLE public.azure_sql_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_resource_id UUID NOT NULL REFERENCES public.azure_resources(id) ON DELETE CASCADE,
  query_hash TEXT NOT NULL,
  query_text TEXT NULL,
  execution_count BIGINT NOT NULL DEFAULT 0,
  total_cpu_time_ms DECIMAL(18, 3) NOT NULL DEFAULT 0,
  avg_cpu_time_ms DECIMAL(18, 3) NOT NULL DEFAULT 0,
  total_duration_ms DECIMAL(18, 3) NOT NULL DEFAULT 0,
  avg_duration_ms DECIMAL(18, 3) NOT NULL DEFAULT 0,
  total_logical_reads BIGINT NOT NULL DEFAULT 0,
  avg_logical_reads DECIMAL(18, 3) NOT NULL DEFAULT 0,
  total_logical_writes BIGINT NOT NULL DEFAULT 0,
  avg_logical_writes DECIMAL(18, 3) NOT NULL DEFAULT 0,
  last_execution_time TIMESTAMP WITH TIME ZONE NULL,
  plan_count INTEGER NULL,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(azure_resource_id, query_hash)
);

-- 6. Create azure_sync_logs table for tracking sync job history
CREATE TABLE public.azure_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_tenant_id UUID NOT NULL REFERENCES public.azure_tenants(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'resources', 'costs', 'metrics', 'sql_insights'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  records_processed INTEGER NULL DEFAULT 0,
  error_message TEXT NULL,
  details JSONB NULL DEFAULT '{}'
);

-- 7. Modify environments table to add Azure fields
ALTER TABLE public.environments
ADD COLUMN azure_tenant_id UUID NULL REFERENCES public.azure_tenants(id) ON DELETE SET NULL,
ADD COLUMN azure_resource_group TEXT NULL,
ADD COLUMN azure_tag_filter JSONB NULL DEFAULT '{}';

-- =============================================
-- Create indexes for better query performance
-- =============================================
CREATE INDEX idx_azure_resources_tenant ON public.azure_resources(azure_tenant_id);
CREATE INDEX idx_azure_resources_type ON public.azure_resources(resource_type);
CREATE INDEX idx_azure_resources_resource_group ON public.azure_resources(resource_group);
CREATE INDEX idx_azure_cost_data_tenant ON public.azure_cost_data(azure_tenant_id);
CREATE INDEX idx_azure_cost_data_date ON public.azure_cost_data(usage_date);
CREATE INDEX idx_azure_cost_data_resource ON public.azure_cost_data(azure_resource_id);
CREATE INDEX idx_azure_metrics_resource ON public.azure_metrics(azure_resource_id);
CREATE INDEX idx_azure_metrics_timestamp ON public.azure_metrics(timestamp_utc);
CREATE INDEX idx_azure_sql_insights_resource ON public.azure_sql_insights(azure_resource_id);
CREATE INDEX idx_azure_sync_logs_tenant ON public.azure_sync_logs(azure_tenant_id);
CREATE INDEX idx_azure_sync_logs_type ON public.azure_sync_logs(sync_type);
CREATE INDEX idx_environments_azure_tenant ON public.environments(azure_tenant_id);

-- =============================================
-- Enable RLS on all new tables
-- =============================================
ALTER TABLE public.azure_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_cost_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_sql_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_sync_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for azure_tenants
-- =============================================
CREATE POLICY "Admins can manage azure tenants"
ON public.azure_tenants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can view azure tenants"
ON public.azure_tenants
FOR SELECT
USING (has_any_role(auth.uid()));

-- =============================================
-- RLS Policies for azure_resources
-- =============================================
CREATE POLICY "Admins and editors can manage azure resources"
ON public.azure_resources
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Team members can view azure resources"
ON public.azure_resources
FOR SELECT
USING (has_any_role(auth.uid()));

-- =============================================
-- RLS Policies for azure_cost_data
-- =============================================
CREATE POLICY "Admins and editors can manage azure cost data"
ON public.azure_cost_data
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Team members can view azure cost data"
ON public.azure_cost_data
FOR SELECT
USING (has_any_role(auth.uid()));

-- =============================================
-- RLS Policies for azure_metrics
-- =============================================
CREATE POLICY "Admins and editors can manage azure metrics"
ON public.azure_metrics
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Team members can view azure metrics"
ON public.azure_metrics
FOR SELECT
USING (has_any_role(auth.uid()));

-- =============================================
-- RLS Policies for azure_sql_insights
-- =============================================
CREATE POLICY "Admins and editors can manage azure sql insights"
ON public.azure_sql_insights
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Team members can view azure sql insights"
ON public.azure_sql_insights
FOR SELECT
USING (has_any_role(auth.uid()));

-- =============================================
-- RLS Policies for azure_sync_logs
-- =============================================
CREATE POLICY "Admins can manage azure sync logs"
ON public.azure_sync_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can view azure sync logs"
ON public.azure_sync_logs
FOR SELECT
USING (has_any_role(auth.uid()));

-- =============================================
-- Create updated_at trigger function if not exists
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- Add updated_at triggers to new tables
-- =============================================
CREATE TRIGGER handle_azure_tenants_updated_at
  BEFORE UPDATE ON public.azure_tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_azure_resources_updated_at
  BEFORE UPDATE ON public.azure_resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_azure_sql_insights_updated_at
  BEFORE UPDATE ON public.azure_sql_insights
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();