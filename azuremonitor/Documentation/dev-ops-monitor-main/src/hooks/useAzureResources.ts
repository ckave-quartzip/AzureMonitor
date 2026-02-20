import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AzureResource {
  id: string;
  azure_tenant_id: string;
  azure_resource_id: string;
  resource_group: string;
  name: string;
  resource_type: string;
  location: string;
  tags: Record<string, string>;
  properties: Record<string, unknown>;
  sku: Record<string, unknown> | null;
  kind: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export function useAzureResources(tenantId: string | undefined, resourceGroup?: string) {
  return useQuery({
    queryKey: ['azure-resources', tenantId, resourceGroup],
    queryFn: async () => {
      if (!tenantId) return [];

      let query = supabase
        .from('azure_resources' as any)
        .select('*')
        .eq('azure_tenant_id', tenantId)
        .order('name') as any;

      if (resourceGroup) {
        query = query.eq('resource_group', resourceGroup);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AzureResource[];
    },
    enabled: !!tenantId,
  });
}

export function useAzureResourceGroups(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['azure-resource-groups', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase.functions.invoke('azure-resources', {
        body: {
          action: 'resource-groups',
          tenantId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.resource_groups as Array<{ name: string; location: string }>;
    },
    enabled: !!tenantId,
  });
}

export function useAzureResourcesByEnvironment(environmentId: string | undefined) {
  return useQuery({
    queryKey: ['azure-resources-by-environment', environmentId],
    queryFn: async () => {
      if (!environmentId) return [];

      // First get the environment to find its azure_tenant_id and resource_group
      const { data: env, error: envError } = await (supabase
        .from('environments' as any)
        .select('azure_tenant_id, azure_resource_group, azure_tag_filter')
        .eq('id', environmentId)
        .single() as any);

      if (envError || !env?.azure_tenant_id) return [];

      let query = supabase
        .from('azure_resources' as any)
        .select('*')
        .eq('azure_tenant_id', env.azure_tenant_id)
        .order('name') as any;

      if (env.azure_resource_group) {
        query = query.eq('resource_group', env.azure_resource_group);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter by tags if tag_filter is set
      let resources = data as AzureResource[];
      if (env.azure_tag_filter && Object.keys(env.azure_tag_filter).length > 0) {
        resources = resources.filter((r) => {
          return Object.entries(env.azure_tag_filter).every(([key, value]) => {
            return r.tags?.[key] === value;
          });
        });
      }

      return resources;
    },
    enabled: !!environmentId,
  });
}
