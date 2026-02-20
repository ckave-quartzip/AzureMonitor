-- Add new Azure metric alert rule types to enum
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_cpu_usage';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_memory_usage';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_dtu_usage';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_storage_usage';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_network_in';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_network_out';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_http_errors';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_response_time';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_requests';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_disk_read';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_disk_write';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_transactions';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_availability';

-- Add Azure-specific columns to alert_rules table
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS azure_resource_id UUID REFERENCES azure_resources(id) ON DELETE CASCADE;
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS azure_tenant_id UUID REFERENCES azure_tenants(id) ON DELETE CASCADE;
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS azure_resource_type TEXT;
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS timeframe_minutes INTEGER DEFAULT 5;
ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS aggregation_type TEXT DEFAULT 'average';

-- Add index for Azure resource lookups
CREATE INDEX IF NOT EXISTS idx_alert_rules_azure_resource_id ON alert_rules(azure_resource_id) WHERE azure_resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alert_rules_azure_tenant_id ON alert_rules(azure_tenant_id) WHERE azure_tenant_id IS NOT NULL;