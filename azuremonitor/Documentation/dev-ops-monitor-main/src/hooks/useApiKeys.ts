import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_enabled: boolean;
  expires_at: string | null;
  created_at: string;
  last_used_at: string | null;
  request_count: number;
  created_by: string | null;
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, is_enabled, expires_at, created_at, last_used_at, request_count, created_by')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ApiKey[];
    },
  });
}

// Generate a cryptographically secure API key
function generateApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const base64 = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `qtz_${base64}`;
}

// Hash API key using Web Crypto API
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: { name: string; expires_at?: string | null }): Promise<{ apiKey: ApiKey; plainTextKey: string }> => {
      // Generate the key
      const plainTextKey = generateApiKey();
      const keyHash = await hashApiKey(plainTextKey);
      const keyPrefix = plainTextKey.substring(0, 12) + '...';
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          name: input.name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          expires_at: input.expires_at || null,
          created_by: user?.id || null,
        })
        .select('id, name, key_prefix, is_enabled, expires_at, created_at, last_used_at, request_count, created_by')
        .single();
      
      if (error) throw error;
      return { apiKey: data as ApiKey, plainTextKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_enabled?: boolean; name?: string; expires_at?: string | null }) => {
      const { data, error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', id)
        .select('id, name, key_prefix, is_enabled, expires_at, created_at, last_used_at, request_count, created_by')
        .single();
      
      if (error) throw error;
      return data as ApiKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useRegenerateApiKey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<{ apiKey: ApiKey; plainTextKey: string }> => {
      // Generate new key
      const plainTextKey = generateApiKey();
      const keyHash = await hashApiKey(plainTextKey);
      const keyPrefix = plainTextKey.substring(0, 12) + '...';
      
      const { data, error } = await supabase
        .from('api_keys')
        .update({
          key_hash: keyHash,
          key_prefix: keyPrefix,
          request_count: 0,
          last_used_at: null,
        })
        .eq('id', id)
        .select('id, name, key_prefix, is_enabled, expires_at, created_at, last_used_at, request_count, created_by')
        .single();
      
      if (error) throw error;
      return { apiKey: data as ApiKey, plainTextKey };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
