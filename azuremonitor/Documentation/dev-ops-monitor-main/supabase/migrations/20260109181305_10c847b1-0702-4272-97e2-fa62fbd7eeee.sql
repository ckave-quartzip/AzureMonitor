-- Fix get_decrypted_setting to allow service role access (for edge functions)
CREATE OR REPLACE FUNCTION public.get_decrypted_setting(p_setting_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decrypted text;
  v_role text;
BEGIN
  -- Get the current role from JWT claim
  v_role := current_setting('request.jwt.claim.role', true);
  
  -- Allow service_role (used by edge functions) OR admin users
  IF v_role = 'service_role' THEN
    -- Service role has full access (for edge functions)
    NULL;
  ELSIF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT ds.decrypted_secret INTO v_decrypted
  FROM public.system_settings ss
  JOIN vault.decrypted_secrets ds ON ss.secret_id = ds.id
  WHERE ss.setting_key = p_setting_key;
  
  RETURN v_decrypted;
END;
$$;