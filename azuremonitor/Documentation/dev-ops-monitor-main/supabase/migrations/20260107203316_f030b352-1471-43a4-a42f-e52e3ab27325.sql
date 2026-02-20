
-- =============================================
-- SYSTEMSGUARD DATABASE SCHEMA
-- =============================================

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

-- 2. Create resource_status enum
CREATE TYPE public.resource_status AS ENUM ('up', 'down', 'degraded', 'unknown');

-- 3. Create check_type enum
CREATE TYPE public.check_type AS ENUM ('http', 'ping', 'port', 'ssl');

-- 4. Create check_result_status enum
CREATE TYPE public.check_result_status AS ENUM ('success', 'failure', 'timeout');

-- 5. Create alert_severity enum
CREATE TYPE public.alert_severity AS ENUM ('critical', 'warning', 'info');

-- 6. Create incident_status enum
CREATE TYPE public.incident_status AS ENUM ('open', 'investigating', 'resolved');

-- 7. Create notification_channel_type enum
CREATE TYPE public.notification_channel_type AS ENUM ('email', 'slack', 'teams', 'webhook');

-- 8. Create alert_rule_type enum
CREATE TYPE public.alert_rule_type AS ENUM ('downtime', 'ssl_expiry', 'response_time', 'consecutive_failures');

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER ROLES TABLE
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECKS
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to check if user has any role (is authenticated team member)
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- =============================================
-- CLIENTS TABLE
-- =============================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  yearly_hosting_fee DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ENVIRONMENTS TABLE
-- =============================================
CREATE TABLE public.environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RESOURCES TABLE
-- =============================================
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  environment_id UUID REFERENCES public.environments(id) ON DELETE SET NULL,
  is_standalone BOOLEAN NOT NULL DEFAULT false,
  status resource_status NOT NULL DEFAULT 'unknown',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- =============================================
-- MONITORING CHECKS TABLE
-- =============================================
CREATE TABLE public.monitoring_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
  check_type check_type NOT NULL,
  url TEXT,
  ip_address TEXT,
  port INTEGER,
  expected_status_code INTEGER DEFAULT 200,
  check_interval_seconds INTEGER NOT NULL DEFAULT 60,
  timeout_seconds INTEGER NOT NULL DEFAULT 30,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_checks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CHECK RESULTS TABLE
-- =============================================
CREATE TABLE public.check_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitoring_check_id UUID REFERENCES public.monitoring_checks(id) ON DELETE CASCADE NOT NULL,
  status check_result_status NOT NULL,
  response_time_ms INTEGER,
  status_code INTEGER,
  error_message TEXT,
  ssl_expiry_date TIMESTAMPTZ,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.check_results ENABLE ROW LEVEL SECURITY;

-- Index for efficient querying of recent results
CREATE INDEX idx_check_results_checked_at ON public.check_results(monitoring_check_id, checked_at DESC);

-- =============================================
-- ALERT RULES TABLE
-- =============================================
CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
  rule_type alert_rule_type NOT NULL,
  threshold_value INTEGER NOT NULL,
  comparison_operator TEXT NOT NULL DEFAULT 'gte' CHECK (comparison_operator IN ('gt', 'gte', 'lt', 'lte', 'eq')),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- =============================================
-- NOTIFICATION CHANNELS TABLE
-- =============================================
CREATE TABLE public.notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel_type notification_channel_type NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ALERT NOTIFICATION CHANNELS (Junction Table)
-- =============================================
CREATE TABLE public.alert_notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE NOT NULL,
  notification_channel_id UUID REFERENCES public.notification_channels(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alert_rule_id, notification_channel_id)
);

ALTER TABLE public.alert_notification_channels ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ALERTS TABLE
-- =============================================
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  severity alert_severity NOT NULL,
  message TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Index for querying active alerts
CREATE INDEX idx_alerts_active ON public.alerts(resource_id, triggered_at DESC) WHERE resolved_at IS NULL;

-- =============================================
-- INCIDENTS TABLE
-- =============================================
CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  severity alert_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'open',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  root_cause TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- =============================================
-- INCIDENT ALERTS (Junction Table)
-- =============================================
CREATE TABLE public.incident_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE CASCADE NOT NULL,
  alert_id UUID REFERENCES public.alerts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (incident_id, alert_id)
);

ALTER TABLE public.incident_alerts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- AZURE CREDENTIALS TABLE (For Future Use)
-- =============================================
CREATE TABLE public.azure_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  tenant_id TEXT NOT NULL,
  azure_client_id TEXT NOT NULL,
  azure_client_secret TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.azure_credentials ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_environments_updated_at BEFORE UPDATE ON public.environments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monitoring_checks_updated_at BEFORE UPDATE ON public.monitoring_checks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_alert_rules_updated_at BEFORE UPDATE ON public.alert_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_channels_updated_at BEFORE UPDATE ON public.notification_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_azure_credentials_updated_at BEFORE UPDATE ON public.azure_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TRIGGER FOR AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES - PROFILES
-- =============================================
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- =============================================
-- RLS POLICIES - USER ROLES
-- =============================================
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - CLIENTS
-- =============================================
CREATE POLICY "Team members can view clients" ON public.clients FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins and editors can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins and editors can update clients" ON public.clients FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins can delete clients" ON public.clients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - ENVIRONMENTS
-- =============================================
CREATE POLICY "Team members can view environments" ON public.environments FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins and editors can insert environments" ON public.environments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins and editors can update environments" ON public.environments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins can delete environments" ON public.environments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - RESOURCES
-- =============================================
CREATE POLICY "Team members can view resources" ON public.resources FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins and editors can insert resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins and editors can update resources" ON public.resources FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins can delete resources" ON public.resources FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - MONITORING CHECKS
-- =============================================
CREATE POLICY "Team members can view monitoring checks" ON public.monitoring_checks FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins and editors can insert monitoring checks" ON public.monitoring_checks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins and editors can update monitoring checks" ON public.monitoring_checks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins can delete monitoring checks" ON public.monitoring_checks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - CHECK RESULTS
-- =============================================
CREATE POLICY "Team members can view check results" ON public.check_results FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "System can insert check results" ON public.check_results FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));

-- =============================================
-- RLS POLICIES - ALERT RULES
-- =============================================
CREATE POLICY "Team members can view alert rules" ON public.alert_rules FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins and editors can insert alert rules" ON public.alert_rules FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins and editors can update alert rules" ON public.alert_rules FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins can delete alert rules" ON public.alert_rules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - NOTIFICATION CHANNELS
-- =============================================
CREATE POLICY "Team members can view notification channels" ON public.notification_channels FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins can manage notification channels" ON public.notification_channels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - ALERT NOTIFICATION CHANNELS
-- =============================================
CREATE POLICY "Team members can view alert notification channels" ON public.alert_notification_channels FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins and editors can manage alert notification channels" ON public.alert_notification_channels FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- =============================================
-- RLS POLICIES - ALERTS
-- =============================================
CREATE POLICY "Team members can view alerts" ON public.alerts FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins and editors can insert alerts" ON public.alerts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins and editors can update alerts" ON public.alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- =============================================
-- RLS POLICIES - INCIDENTS
-- =============================================
CREATE POLICY "Team members can view incidents" ON public.incidents FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins and editors can insert incidents" ON public.incidents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins and editors can update incidents" ON public.incidents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admins can delete incidents" ON public.incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS POLICIES - INCIDENT ALERTS
-- =============================================
CREATE POLICY "Team members can view incident alerts" ON public.incident_alerts FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));
CREATE POLICY "Admins and editors can manage incident alerts" ON public.incident_alerts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- =============================================
-- RLS POLICIES - AZURE CREDENTIALS
-- =============================================
CREATE POLICY "Admins can manage azure credentials" ON public.azure_credentials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
