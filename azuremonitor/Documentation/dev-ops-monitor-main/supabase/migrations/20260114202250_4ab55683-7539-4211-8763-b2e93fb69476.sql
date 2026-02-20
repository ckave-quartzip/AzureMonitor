-- Add new check types to the check_type enum
ALTER TYPE check_type ADD VALUE IF NOT EXISTS 'azure_metric';
ALTER TYPE check_type ADD VALUE IF NOT EXISTS 'azure_health';

-- Add Azure-specific columns to monitoring_checks table
ALTER TABLE monitoring_checks ADD COLUMN IF NOT EXISTS azure_metric_name TEXT;
ALTER TABLE monitoring_checks ADD COLUMN IF NOT EXISTS azure_metric_namespace TEXT;
ALTER TABLE monitoring_checks ADD COLUMN IF NOT EXISTS timeframe_minutes INTEGER DEFAULT 5;
ALTER TABLE monitoring_checks ADD COLUMN IF NOT EXISTS aggregation_type TEXT DEFAULT 'average';
ALTER TABLE monitoring_checks ADD COLUMN IF NOT EXISTS metric_threshold_value DECIMAL(18, 6);
ALTER TABLE monitoring_checks ADD COLUMN IF NOT EXISTS metric_comparison_operator TEXT DEFAULT 'gt';

-- Add comments for documentation
COMMENT ON COLUMN monitoring_checks.azure_metric_name IS 'Azure metric name to monitor (e.g., Percentage CPU)';
COMMENT ON COLUMN monitoring_checks.azure_metric_namespace IS 'Azure metric namespace for grouping';
COMMENT ON COLUMN monitoring_checks.timeframe_minutes IS 'Evaluation window in minutes (5, 15, 30, 60)';
COMMENT ON COLUMN monitoring_checks.aggregation_type IS 'Aggregation type: average, max, min, total';
COMMENT ON COLUMN monitoring_checks.metric_threshold_value IS 'Threshold value for comparison';
COMMENT ON COLUMN monitoring_checks.metric_comparison_operator IS 'Comparison operator: gt, gte, lt, lte';