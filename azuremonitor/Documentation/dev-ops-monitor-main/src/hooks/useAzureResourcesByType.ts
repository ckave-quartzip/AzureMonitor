import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AzureResourceWithCost {
  id: string;
  name: string;
  resource_type: string;
  resource_group: string;
  location: string;
  azure_resource_id: string;
  synced_at: string;
  tenant_name: string;
  monthly_cost: number;
}

export function useAzureResourcesByType(resourceType: string | undefined) {
  return useQuery({
    queryKey: ['azure-resources-by-type', resourceType],
    queryFn: async () => {
      if (!resourceType) return [];

      // Fetch resources matching the type
      const { data: resources, error: resourcesError } = await (supabase
        .from('azure_resources' as any)
        .select(`
          id,
          name,
          resource_type,
          resource_group,
          location,
          azure_resource_id,
          synced_at,
          azure_tenant_id
        `)
        .ilike('resource_type', `%${resourceType}`) as any);

      if (resourcesError) throw resourcesError;

      // Fetch tenant names
      const { data: tenants } = await (supabase
        .from('azure_tenants' as any)
        .select('id, name') as any);
      
      const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));

      // Fetch current month costs for these resources
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      // Fetch all current month costs
      const { data: costs } = await (supabase
        .from('azure_cost_data' as any)
        .select('azure_resource_id, cost_amount')
        .gte('usage_date', currentMonthStart) as any);

      // Aggregate costs by azure_resource_id (case-insensitive matching)
      const costByAzureResourceId: Record<string, number> = {};
      (costs || []).forEach((c: any) => {
        if (c.azure_resource_id) {
          const key = c.azure_resource_id.toLowerCase();
          costByAzureResourceId[key] = (costByAzureResourceId[key] || 0) + 
            (parseFloat(c.cost_amount) || 0);
        }
      });

      // Combine resources with costs (matching on azure_resource_id, not id)
      return (resources || []).map((r: any): AzureResourceWithCost => ({
        id: r.id,
        name: r.name,
        resource_type: r.resource_type,
        resource_group: r.resource_group,
        location: r.location,
        azure_resource_id: r.azure_resource_id,
        synced_at: r.synced_at,
        tenant_name: (tenantMap.get(r.azure_tenant_id) as string) || 'Unknown',
        monthly_cost: costByAzureResourceId[r.azure_resource_id.toLowerCase()] || 0,
      }));
    },
    enabled: !!resourceType,
  });
}
