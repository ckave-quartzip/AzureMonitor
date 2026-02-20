import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  secret_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Office 365 setting keys
export const O365_SETTINGS = {
  TENANT_ID: 'ms_graph_tenant_id',
  CLIENT_ID: 'ms_graph_client_id',
  CLIENT_SECRET: 'ms_graph_client_secret',
  SENDER_EMAIL: 'ms_graph_sender_email',
} as const;

// General app settings
export const APP_SETTINGS = {
  APP_URL: 'app_url',
} as const;

// Fetch all system settings (metadata only, not decrypted values)
export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      return data as SystemSetting[];
    },
  });
}

// Check if a setting exists
export function useSettingExists(settingKey: string) {
  return useQuery({
    queryKey: ['setting-exists', settingKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('setting_exists', {
        p_setting_key: settingKey,
      });

      if (error) throw error;
      return data as boolean;
    },
  });
}

// Get decrypted setting value (admin only)
export function useDecryptedSetting(settingKey: string, enabled = true) {
  return useQuery({
    queryKey: ['decrypted-setting', settingKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_decrypted_setting', {
        p_setting_key: settingKey,
      });

      if (error) throw error;
      return data as string | null;
    },
    enabled,
  });
}

// Upsert encrypted setting
export function useUpsertEncryptedSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      settingKey,
      value,
      description,
    }: {
      settingKey: string;
      value: string;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('upsert_encrypted_setting', {
        p_setting_key: settingKey,
        p_value: value,
        p_description: description || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['setting-exists'] });
      queryClient.invalidateQueries({ queryKey: ['decrypted-setting'] });
    },
    onError: (error) => {
      toast.error('Failed to save setting: ' + error.message);
    },
  });
}

// Delete encrypted setting
export function useDeleteEncryptedSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settingKey: string) => {
      const { data, error } = await supabase.rpc('delete_encrypted_setting', {
        p_setting_key: settingKey,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['setting-exists'] });
      queryClient.invalidateQueries({ queryKey: ['decrypted-setting'] });
    },
    onError: (error) => {
      toast.error('Failed to delete setting: ' + error.message);
    },
  });
}

// Hook to get all O365 settings at once
export function useO365Settings() {
  const tenantId = useDecryptedSetting(O365_SETTINGS.TENANT_ID);
  const clientId = useDecryptedSetting(O365_SETTINGS.CLIENT_ID);
  const clientSecret = useDecryptedSetting(O365_SETTINGS.CLIENT_SECRET);
  const senderEmail = useDecryptedSetting(O365_SETTINGS.SENDER_EMAIL);

  const isLoading =
    tenantId.isLoading ||
    clientId.isLoading ||
    clientSecret.isLoading ||
    senderEmail.isLoading;

  const isConfigured =
    !!tenantId.data &&
    !!clientId.data &&
    !!clientSecret.data &&
    !!senderEmail.data;

  return {
    tenantId: tenantId.data,
    clientId: clientId.data,
    clientSecret: clientSecret.data,
    senderEmail: senderEmail.data,
    isLoading,
    isConfigured,
    refetch: () => {
      tenantId.refetch();
      clientId.refetch();
      clientSecret.refetch();
      senderEmail.refetch();
    },
  };
}
