-- Phase 1.1: Add Keyword Monitoring
ALTER TYPE check_type ADD VALUE IF NOT EXISTS 'keyword';

-- Phase 5: Heartbeat Monitoring
ALTER TYPE check_type ADD VALUE IF NOT EXISTS 'heartbeat';

-- Phase 1.2 & 1.3: Add columns to monitoring_checks for enhanced features
ALTER TABLE monitoring_checks 
ADD COLUMN IF NOT EXISTS keyword_value text,
ADD COLUMN IF NOT EXISTS keyword_type text CHECK (keyword_type IN ('contains', 'not_contains')),
ADD COLUMN IF NOT EXISTS http_method text DEFAULT 'GET',
ADD COLUMN IF NOT EXISTS http_auth_type text CHECK (http_auth_type IN ('none', 'basic', 'bearer')),
ADD COLUMN IF NOT EXISTS http_auth_credentials jsonb,
ADD COLUMN IF NOT EXISTS custom_headers jsonb;

-- Phase 3: Consecutive Failure Threshold
ALTER TABLE monitoring_checks 
ADD COLUMN IF NOT EXISTS failure_threshold integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_failure_count integer DEFAULT 0;

-- Phase 5: Heartbeat columns
ALTER TABLE monitoring_checks 
ADD COLUMN IF NOT EXISTS heartbeat_interval_seconds integer,
ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz,
ADD COLUMN IF NOT EXISTS heartbeat_token uuid DEFAULT gen_random_uuid();

-- Phase 2: SSL Expiry Days tracking
ALTER TABLE check_results 
ADD COLUMN IF NOT EXISTS ssl_days_remaining integer;

-- Phase 4: Maintenance Windows
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  is_recurring boolean DEFAULT false,
  recurrence_pattern text CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on maintenance_windows
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;

-- RLS policies for maintenance_windows
CREATE POLICY "Team members can view maintenance windows" 
ON maintenance_windows FOR SELECT 
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can insert maintenance windows" 
ON maintenance_windows FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can update maintenance windows" 
ON maintenance_windows FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins can delete maintenance windows" 
ON maintenance_windows FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_resource_time 
ON maintenance_windows(resource_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_monitoring_checks_heartbeat_token 
ON monitoring_checks(heartbeat_token) WHERE heartbeat_token IS NOT NULL;