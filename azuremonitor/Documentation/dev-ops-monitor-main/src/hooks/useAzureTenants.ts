import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AzureTenant {
  id: string;
  name: string;
  tenant_id: string;
  client_id: string;
  subscription_id: string;
  client_secret_id: string | null;
  is_enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AzureTenantInsert {
  name: string;
  tenant_id: string;
  client_id: string;
  subscription_id: string;
  client_secret: string; // Raw secret to be stored in vault
  is_enabled?: boolean;
}

export interface AzureTenantUpdate {
  name?: string;
  tenant_id?: string;
  client_id?: string;
  subscription_id?: string;
  client_secret?: string; // Only if updating the secret
  is_enabled?: boolean;
}

export function useAzureTenants() {
  return useQuery({
    queryKey: ['azure-tenants'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('azure_tenants' as any)
        .select('*')
        .order('name') as any);

      if (error) throw error;
      return data as AzureTenant[];
    },
  });
}

export function useAzureTenant(id: string | undefined) {
  return useQuery({
    queryKey: ['azure-tenants', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await (supabase
        .from('azure_tenants' as any)
        .select('*')
        .eq('id', id)
        .single() as any);

      if (error) throw error;
      return data as AzureTenant;
    },
    enabled: !!id,
  });
}

export function useCreateAzureTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenant: AzureTenantInsert) => {
      // First, store the client secret in vault
      const secretKey = `azure_client_secret_${crypto.randomUUID()}`;
      
      const { data: secretId, error: secretError } = await supabase.rpc(
        'upsert_encrypted_setting' as any,
        {
          p_setting_key: secretKey,
          p_value: tenant.client_secret,
          p_description: `Azure client secret for ${tenant.name}`,
        } as any
      );

      if (secretError) {
        throw new Error(`Failed to store client secret: ${secretError.message}`);
      }

      // Now create the tenant record
      const { data, error } = await (supabase
        .from('azure_tenants' as any)
        .insert({
          name: tenant.name,
          tenant_id: tenant.tenant_id,
          client_id: tenant.client_id,
          subscription_id: tenant.subscription_id,
          client_secret_id: secretKey.replace('azure_client_secret_', ''),
          is_enabled: tenant.is_enabled ?? true,
        })
        .select()
        .single() as any);

      if (error) {
        // Try to clean up the secret if tenant creation failed
        await supabase.rpc('delete_encrypted_setting' as any, { p_setting_key: secretKey } as any);
        throw error;
      }

      return data as AzureTenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-tenants'] });
      toast({
        title: 'Azure tenant created',
        description: 'The Azure tenant has been configured successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating Azure tenant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAzureTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AzureTenantUpdate }) => {
      // If updating the client secret, store it first
      if (updates.client_secret) {
        const secretKey = `azure_client_secret_${crypto.randomUUID()}`;
        
        const { error: secretError } = await supabase.rpc(
          'upsert_encrypted_setting' as any,
          {
            p_setting_key: secretKey,
            p_value: updates.client_secret,
            p_description: `Azure client secret for ${updates.name || 'tenant'}`,
          } as any
        );

        if (secretError) {
          throw new Error(`Failed to store client secret: ${secretError.message}`);
        }

        // Update with new secret ID
        const updateData: Record<string, any> = {
          ...updates,
          client_secret_id: secretKey.replace('azure_client_secret_', ''),
        };
        delete updateData.client_secret;

        const { data, error } = await (supabase
          .from('azure_tenants' as any)
          .update(updateData)
          .eq('id', id)
          .select()
          .single() as any);

        if (error) throw error;
        return data as AzureTenant;
      }

      // Update without changing secret
      const { client_secret, ...updateData } = updates;
      
      const { data, error } = await (supabase
        .from('azure_tenants' as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AzureTenant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-tenants'] });
      toast({
        title: 'Azure tenant updated',
        description: 'The Azure tenant has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating Azure tenant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAzureTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the tenant first to get the secret ID
      const { data: tenant, error: fetchError } = await (supabase
        .from('azure_tenants' as any)
        .select('client_secret_id')
        .eq('id', id)
        .single() as any);

      if (fetchError) throw fetchError;

      // Delete the tenant (cascades to related records)
      const { error } = await (supabase
        .from('azure_tenants' as any)
        .delete()
        .eq('id', id) as any);

      if (error) throw error;

      // Clean up the secret from vault
      if (tenant?.client_secret_id) {
        await supabase.rpc(
          'delete_encrypted_setting' as any,
          { p_setting_key: `azure_client_secret_${tenant.client_secret_id}` } as any
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-tenants'] });
      toast({
        title: 'Azure tenant deleted',
        description: 'The Azure tenant has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting Azure tenant',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
