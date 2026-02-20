-- Create a table to store system-wide configuration settings
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  secret_id uuid,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view settings
CREATE POLICY "Admins can view system settings"
  ON public.system_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert system settings"
  ON public.system_settings FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update settings
CREATE POLICY "Admins can update system settings"
  ON public.system_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete settings
CREATE POLICY "Admins can delete system settings"
  ON public.system_settings FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create or update an encrypted setting using vault
CREATE OR REPLACE FUNCTION public.upsert_encrypted_setting(
  p_setting_key text,
  p_value text,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_id uuid;
  v_existing_secret_id uuid;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Check if setting exists and get existing secret_id
  SELECT secret_id INTO v_existing_secret_id
  FROM public.system_settings
  WHERE setting_key = p_setting_key;
  
  -- Delete old secret if exists
  IF v_existing_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_existing_secret_id;
  END IF;
  
  -- Create new secret in vault
  SELECT vault.create_secret(p_value, p_setting_key) INTO v_secret_id;
  
  -- Upsert the setting
  INSERT INTO public.system_settings (setting_key, secret_id, description)
  VALUES (p_setting_key, v_secret_id, p_description)
  ON CONFLICT (setting_key)
  DO UPDATE SET
    secret_id = v_secret_id,
    description = COALESCE(p_description, system_settings.description),
    updated_at = now();
  
  RETURN v_secret_id;
END;
$$;

-- Function to get decrypted setting (admin only)
CREATE OR REPLACE FUNCTION public.get_decrypted_setting(p_setting_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decrypted text;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT ds.decrypted_secret INTO v_decrypted
  FROM public.system_settings ss
  JOIN vault.decrypted_secrets ds ON ss.secret_id = ds.id
  WHERE ss.setting_key = p_setting_key;
  
  RETURN v_decrypted;
END;
$$;

-- Function to delete a setting and its secret
CREATE OR REPLACE FUNCTION public.delete_encrypted_setting(p_setting_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT secret_id INTO v_secret_id
  FROM public.system_settings
  WHERE setting_key = p_setting_key;
  
  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
  
  DELETE FROM public.system_settings WHERE setting_key = p_setting_key;
  
  RETURN FOUND;
END;
$$;

-- Function to check if a setting exists (for UI purposes)
CREATE OR REPLACE FUNCTION public.setting_exists(p_setting_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_settings WHERE setting_key = p_setting_key
  );
$$;