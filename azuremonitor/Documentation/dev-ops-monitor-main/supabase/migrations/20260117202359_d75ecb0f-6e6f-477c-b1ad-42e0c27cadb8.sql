-- Create api_keys table for managing API access
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  request_count BIGINT DEFAULT 0
);

-- Create index for fast key lookup
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_is_enabled ON public.api_keys(is_enabled);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admins can manage API keys
CREATE POLICY "Admins can view API keys"
  ON public.api_keys
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create API keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update API keys"
  ON public.api_keys
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete API keys"
  ON public.api_keys
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to validate API key (for edge functions using service role)
CREATE OR REPLACE FUNCTION public.validate_api_key(p_key_hash TEXT)
RETURNS TABLE(key_id UUID, key_name TEXT, is_valid BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.id,
    ak.name,
    (ak.is_enabled AND (ak.expires_at IS NULL OR ak.expires_at > NOW())) as is_valid
  FROM public.api_keys ak
  WHERE ak.key_hash = p_key_hash;
END;
$$;

-- Function to update API key usage stats
CREATE OR REPLACE FUNCTION public.update_api_key_usage(p_key_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.api_keys
  SET 
    last_used_at = NOW(),
    request_count = request_count + 1
  WHERE id = p_key_id;
END;
$$;