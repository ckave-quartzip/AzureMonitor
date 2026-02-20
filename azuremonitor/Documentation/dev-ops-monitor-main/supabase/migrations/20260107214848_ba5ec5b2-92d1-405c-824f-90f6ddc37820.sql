-- Make resource_id nullable for template rules
ALTER TABLE alert_rules 
  ALTER COLUMN resource_id DROP NOT NULL;

-- Add columns for template functionality
ALTER TABLE alert_rules 
  ADD COLUMN resource_type text DEFAULT NULL,
  ADD COLUMN is_template boolean DEFAULT false,
  ADD COLUMN name text DEFAULT NULL;

-- Add constraint: must have either resource_id OR resource_type (for templates)
ALTER TABLE alert_rules 
  ADD CONSTRAINT alert_rules_target_check 
  CHECK (
    (resource_id IS NOT NULL AND resource_type IS NULL AND is_template = false) OR 
    (resource_id IS NULL AND resource_type IS NOT NULL AND is_template = true)
  );

-- Create exclusions table for resources to opt-out of template rules
CREATE TABLE alert_rule_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id uuid NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alert_rule_id, resource_id)
);

-- Enable RLS on exclusions table
ALTER TABLE alert_rule_exclusions ENABLE ROW LEVEL SECURITY;

-- RLS policies for exclusions table
CREATE POLICY "Team members can view alert rule exclusions"
  ON alert_rule_exclusions FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can insert alert rule exclusions"
  ON alert_rule_exclusions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Admins and editors can delete alert rule exclusions"
  ON alert_rule_exclusions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));