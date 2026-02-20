-- Persist Azure Advisor recommendations for SQL databases
CREATE TABLE public.azure_sql_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_resource_id UUID REFERENCES public.azure_resources(id) ON DELETE CASCADE,
  recommendation_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  impact TEXT,
  impacted_field TEXT,
  impacted_value TEXT,
  problem TEXT,
  solution TEXT,
  is_resolved BOOLEAN DEFAULT false,
  first_seen_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(azure_resource_id, recommendation_id)
);

-- Store DTU, CPU, blocking, deadlock trends for SQL databases
CREATE TABLE public.azure_sql_performance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_resource_id UUID REFERENCES public.azure_resources(id) ON DELETE CASCADE,
  timestamp_utc TIMESTAMPTZ NOT NULL,
  cpu_percent DECIMAL(5,2),
  dtu_percent DECIMAL(5,2),
  storage_percent DECIMAL(5,2),
  deadlock_count INTEGER DEFAULT 0,
  blocked_count INTEGER DEFAULT 0,
  connection_count INTEGER,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient time-series queries
CREATE INDEX idx_sql_perf_resource_time 
ON public.azure_sql_performance_stats(azure_resource_id, timestamp_utc DESC);

-- Index for recommendations by resource
CREATE INDEX idx_sql_recommendations_resource 
ON public.azure_sql_recommendations(azure_resource_id);

-- Enable RLS
ALTER TABLE public.azure_sql_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_sql_performance_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for azure_sql_recommendations
CREATE POLICY "Users with any role can view SQL recommendations"
ON public.azure_sql_recommendations FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can insert SQL recommendations"
ON public.azure_sql_recommendations FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can update SQL recommendations"
ON public.azure_sql_recommendations FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete SQL recommendations"
ON public.azure_sql_recommendations FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for azure_sql_performance_stats
CREATE POLICY "Users with any role can view SQL performance stats"
ON public.azure_sql_performance_stats FOR SELECT
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can insert SQL performance stats"
ON public.azure_sql_performance_stats FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can update SQL performance stats"
ON public.azure_sql_performance_stats FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins can delete SQL performance stats"
ON public.azure_sql_performance_stats FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));