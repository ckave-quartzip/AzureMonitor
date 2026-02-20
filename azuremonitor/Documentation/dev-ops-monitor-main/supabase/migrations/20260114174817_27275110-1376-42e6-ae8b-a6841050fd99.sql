-- =============================================
-- Feature 1: Cost Anomaly Detection
-- =============================================
CREATE TABLE public.azure_cost_anomalies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_tenant_id UUID NOT NULL REFERENCES public.azure_tenants(id) ON DELETE CASCADE,
  azure_resource_id UUID REFERENCES public.azure_resources(id) ON DELETE SET NULL,
  resource_group TEXT,
  anomaly_date DATE NOT NULL,
  expected_cost NUMERIC(12, 2) NOT NULL,
  actual_cost NUMERIC(12, 2) NOT NULL,
  deviation_percent NUMERIC(8, 2) NOT NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('spike', 'drop')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for cost anomalies
CREATE INDEX idx_cost_anomalies_tenant ON public.azure_cost_anomalies(azure_tenant_id);
CREATE INDEX idx_cost_anomalies_date ON public.azure_cost_anomalies(anomaly_date DESC);
CREATE INDEX idx_cost_anomalies_unacknowledged ON public.azure_cost_anomalies(is_acknowledged) WHERE is_acknowledged = false;
CREATE UNIQUE INDEX idx_cost_anomalies_unique ON public.azure_cost_anomalies(azure_tenant_id, COALESCE(azure_resource_id, '00000000-0000-0000-0000-000000000000'::uuid), anomaly_date);

-- RLS for cost anomalies
ALTER TABLE public.azure_cost_anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with any role can view cost anomalies"
  ON public.azure_cost_anomalies FOR SELECT
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can manage cost anomalies"
  ON public.azure_cost_anomalies FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- =============================================
-- Feature 2: Resource Optimization Scores
-- =============================================
ALTER TABLE public.azure_resources 
ADD COLUMN IF NOT EXISTS optimization_score INTEGER,
ADD COLUMN IF NOT EXISTS score_breakdown JSONB,
ADD COLUMN IF NOT EXISTS score_updated_at TIMESTAMPTZ;

-- Index for optimization score queries
CREATE INDEX idx_resources_optimization_score ON public.azure_resources(optimization_score) WHERE optimization_score IS NOT NULL;

-- =============================================
-- Feature 3: Idle Resource Detection
-- =============================================
CREATE TABLE public.azure_idle_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  azure_resource_id UUID NOT NULL REFERENCES public.azure_resources(id) ON DELETE CASCADE,
  azure_tenant_id UUID NOT NULL REFERENCES public.azure_tenants(id) ON DELETE CASCADE,
  detection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  idle_days INTEGER NOT NULL,
  monthly_cost NUMERIC(12, 2) NOT NULL,
  idle_reason TEXT NOT NULL,
  metrics_summary JSONB,
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'ignored', 'actioned', 'resolved')),
  ignored_reason TEXT,
  ignored_by UUID,
  ignored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for idle resources
CREATE INDEX idx_idle_resources_tenant ON public.azure_idle_resources(azure_tenant_id);
CREATE INDEX idx_idle_resources_status ON public.azure_idle_resources(status) WHERE status = 'detected';
CREATE UNIQUE INDEX idx_idle_resources_unique ON public.azure_idle_resources(azure_resource_id, detection_date);

-- RLS for idle resources
ALTER TABLE public.azure_idle_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with any role can view idle resources"
  ON public.azure_idle_resources FOR SELECT
  USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can manage idle resources"
  ON public.azure_idle_resources FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Trigger for updated_at
CREATE TRIGGER update_idle_resources_updated_at
  BEFORE UPDATE ON public.azure_idle_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();