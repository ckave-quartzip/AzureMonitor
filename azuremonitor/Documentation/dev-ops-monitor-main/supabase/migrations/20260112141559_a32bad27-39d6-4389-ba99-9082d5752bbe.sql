-- Add new alert rule types for Azure cost alerts
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_cost_threshold';
ALTER TYPE alert_rule_type ADD VALUE IF NOT EXISTS 'azure_cost_anomaly';

-- Create Azure cost alert rules table
CREATE TABLE IF NOT EXISTS public.azure_cost_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  azure_tenant_id UUID REFERENCES azure_tenants(id) ON DELETE CASCADE,
  resource_group TEXT,
  azure_resource_id UUID REFERENCES azure_resources(id) ON DELETE SET NULL,
  threshold_amount DECIMAL(12,2) NOT NULL,
  threshold_period TEXT NOT NULL DEFAULT 'monthly',
  comparison_operator TEXT NOT NULL DEFAULT 'gt',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Azure cost alerts table (triggered alerts)
CREATE TABLE IF NOT EXISTS public.azure_cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES azure_cost_alert_rules(id) ON DELETE CASCADE,
  azure_tenant_id UUID REFERENCES azure_tenants(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  current_cost DECIMAL(12,2) NOT NULL,
  threshold_amount DECIMAL(12,2) NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.azure_cost_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_cost_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for azure_cost_alert_rules
CREATE POLICY "Users with roles can view cost alert rules" 
ON public.azure_cost_alert_rules 
FOR SELECT 
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins can insert cost alert rules" 
ON public.azure_cost_alert_rules 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update cost alert rules" 
ON public.azure_cost_alert_rules 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cost alert rules" 
ON public.azure_cost_alert_rules 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for azure_cost_alerts
CREATE POLICY "Users with roles can view cost alerts" 
ON public.azure_cost_alerts 
FOR SELECT 
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Service can insert cost alerts" 
ON public.azure_cost_alerts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users with roles can update cost alerts" 
ON public.azure_cost_alerts 
FOR UPDATE 
USING (public.has_any_role(auth.uid()));

-- Trigger for updated_at on cost alert rules
CREATE TRIGGER update_azure_cost_alert_rules_updated_at
BEFORE UPDATE ON public.azure_cost_alert_rules
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_azure_cost_alert_rules_tenant ON public.azure_cost_alert_rules(azure_tenant_id);
CREATE INDEX IF NOT EXISTS idx_azure_cost_alerts_rule ON public.azure_cost_alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_azure_cost_alerts_triggered ON public.azure_cost_alerts(triggered_at DESC);