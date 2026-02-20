-- Add quiet hours columns to alert_rules table
ALTER TABLE public.alert_rules 
ADD COLUMN quiet_hours_enabled boolean DEFAULT false,
ADD COLUMN quiet_hours_start time,
ADD COLUMN quiet_hours_end time,
ADD COLUMN quiet_hours_days text[],
ADD COLUMN quiet_hours_timezone text DEFAULT 'UTC';

-- Add quiet hours columns to azure_cost_alert_rules table
ALTER TABLE public.azure_cost_alert_rules 
ADD COLUMN quiet_hours_enabled boolean DEFAULT false,
ADD COLUMN quiet_hours_start time,
ADD COLUMN quiet_hours_end time,
ADD COLUMN quiet_hours_days text[],
ADD COLUMN quiet_hours_timezone text DEFAULT 'UTC';

-- Add notification suppression tracking to alerts table
ALTER TABLE public.alerts 
ADD COLUMN notification_suppressed boolean DEFAULT false,
ADD COLUMN suppression_reason text;

-- Add notification suppression tracking to azure_cost_alerts table
ALTER TABLE public.azure_cost_alerts 
ADD COLUMN notification_suppressed boolean DEFAULT false,
ADD COLUMN suppression_reason text;