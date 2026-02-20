import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TopSpendingResource {
  id: string;
  name: string;
  resourceType: string;
  resourceGroup: string;
  cost: number;
  azureResourceId: string;
}

export function useTopSpendingResources(limit: number = 5, tenantIds?: string[]) {
  return useQuery({
    queryKey: ['top-spending-resources', limit, tenantIds],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      // Fetch current month costs grouped by resource with pagination
      const BATCH_SIZE = 1000;
      let allCostData: any[] = [];
      let offset = 0;

      while (true) {
        let query = supabase
          .from('azure_cost_data')
          .select('azure_resource_id, cost_amount')
          .gte('usage_date', currentMonthStart)
          .not('azure_resource_id', 'is', null)
          .range(offset, offset + BATCH_SIZE - 1);

        if (tenantIds && tenantIds.length > 0) {
          query = query.in('azure_tenant_id', tenantIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        allCostData = allCostData.concat(data);
        offset += BATCH_SIZE;
        if (data.length < BATCH_SIZE) break;
      }

      // Aggregate costs by azure_resource_id
      const costByResource: Record<string, number> = {};
      allCostData.forEach((c) => {
        const resourceId = c.azure_resource_id?.toLowerCase() || '';
        if (resourceId) {
          costByResource[resourceId] = (costByResource[resourceId] || 0) + (parseFloat(String(c.cost_amount)) || 0);
        }
      });

      // Get top resource IDs by cost
      const sortedResources = Object.entries(costByResource)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit);

      if (sortedResources.length === 0) {
        return [];
      }

      // Fetch resource details
      let resourceQuery = supabase
        .from('azure_resources')
        .select('id, name, resource_type, resource_group, azure_resource_id')
        .limit(5000);

      if (tenantIds && tenantIds.length > 0) {
        resourceQuery = resourceQuery.in('azure_tenant_id', tenantIds);
      }

      const { data: resources, error: resourcesError } = await resourceQuery;
      if (resourcesError) throw resourcesError;

      // Create lookup map (case-insensitive)
      const resourceMap = new Map(
        (resources || []).map((r) => [r.azure_resource_id.toLowerCase(), r])
      );

      // Build result
      const result: TopSpendingResource[] = sortedResources
        .map(([azureResourceId, cost]) => {
          const resource = resourceMap.get(azureResourceId);
          if (!resource) return null;
          return {
            id: resource.id,
            name: resource.name,
            resourceType: resource.resource_type,
            resourceGroup: resource.resource_group,
            cost,
            azureResourceId: resource.azure_resource_id,
          };
        })
        .filter((r): r is TopSpendingResource => r !== null);

      return result;
    },
  });
}
