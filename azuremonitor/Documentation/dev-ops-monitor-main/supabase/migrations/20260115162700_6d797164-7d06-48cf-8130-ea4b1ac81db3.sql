CREATE OR REPLACE FUNCTION public.get_rolling_cost_stats(
  p_days_back integer DEFAULT 30,
  p_tenant_ids uuid[] DEFAULT NULL::uuid[]
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
  -- Get the latest date with cost data (filtered by tenant if specified)
  IF p_tenant_ids IS NULL THEN
    SELECT MAX(usage_date) INTO v_end_date FROM azure_cost_data;
  ELSE
    SELECT MAX(usage_date) INTO v_end_date 
    FROM azure_cost_data 
    WHERE azure_tenant_id = ANY(p_tenant_ids);
  END IF;
  
  -- If no data, return zeros
  IF v_end_date IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, CURRENT_DATE, CURRENT_DATE;
    RETURN;
  END IF;
  
  -- Calculate date ranges based on actual data
  v_start_date := v_end_date - (p_days_back - 1);
  v_prev_start_date := v_start_date - p_days_back;
  
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN usage_date >= v_start_date AND usage_date <= v_end_date THEN cost_amount ELSE 0 END), 0) as current_period_total,
    COALESCE(SUM(CASE WHEN usage_date >= v_prev_start_date AND usage_date < v_start_date THEN cost_amount ELSE 0 END), 0) as previous_period_total,
    v_start_date as current_period_start,
    v_end_date as current_period_end
  FROM azure_cost_data
  WHERE (p_tenant_ids IS NULL OR azure_tenant_id = ANY(p_tenant_ids));
END;
$$;