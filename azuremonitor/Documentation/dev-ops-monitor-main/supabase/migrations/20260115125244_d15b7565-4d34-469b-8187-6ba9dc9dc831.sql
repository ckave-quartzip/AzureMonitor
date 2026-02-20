-- Create function to get 30-day cost stats efficiently
CREATE OR REPLACE FUNCTION public.get_rolling_cost_stats(
  p_days_back integer DEFAULT 30
)
RETURNS TABLE (
  current_period_total numeric,
  previous_period_total numeric,
  current_period_start date,
  current_period_end date
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_date date;
  v_start_date date;
  v_prev_start_date date;
BEGIN
  -- Get the latest date with cost data
  SELECT usage_date INTO v_end_date
  FROM azure_cost_data
  ORDER BY usage_date DESC
  LIMIT 1;
  
  IF v_end_date IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, CURRENT_DATE, CURRENT_DATE;
    RETURN;
  END IF;
  
  -- Calculate date ranges
  v_start_date := v_end_date - (p_days_back - 1);
  v_prev_start_date := v_start_date - p_days_back;
  
  RETURN QUERY
  SELECT 
    (SELECT COALESCE(SUM(cost_amount), 0) 
     FROM azure_cost_data 
     WHERE usage_date >= v_start_date AND usage_date <= v_end_date)::numeric as current_period_total,
    (SELECT COALESCE(SUM(cost_amount), 0) 
     FROM azure_cost_data 
     WHERE usage_date >= v_prev_start_date AND usage_date < v_start_date)::numeric as previous_period_total,
    v_start_date as current_period_start,
    v_end_date as current_period_end;
END;
$$;