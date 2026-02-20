-- Add retry configuration columns to monitoring_checks table
ALTER TABLE public.monitoring_checks
ADD COLUMN retry_count integer DEFAULT 3,
ADD COLUMN retry_delay_ms integer DEFAULT 2000,
ADD COLUMN confirmation_delay_ms integer DEFAULT 5000;

-- Add comments for documentation
COMMENT ON COLUMN public.monitoring_checks.retry_count IS 'Number of retries before marking check as failed';
COMMENT ON COLUMN public.monitoring_checks.retry_delay_ms IS 'Delay in milliseconds between retry attempts';
COMMENT ON COLUMN public.monitoring_checks.confirmation_delay_ms IS 'Delay in milliseconds before confirmation check';