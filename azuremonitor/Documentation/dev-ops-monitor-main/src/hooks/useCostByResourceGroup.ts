import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResourceGroupCost {
  resourceGroup: string;
  cost: number;
  percentage: number;
  resourceCount: number;
}

export function useCostByResourceGroup(limit: number = 5, tenantIds?: string[]) {
  return useQuery({
    queryKey: ['cost-by-resource-group', limit, tenantIds],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      // Fetch current month costs with resource_group using pagination
      const BATCH_SIZE = 1000;
      let allCostData: any[] = [];
      let offset = 0;

      while (true) {
        let query = supabase
          .from('azure_cost_data')
          .select('resource_group, cost_amount')
          .gte('usage_date', currentMonthStart)
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

      // Fetch resources to count per group
      let resourceQuery = supabase
        .from('azure_resources')
        .select('resource_group')
        .limit(5000);

      if (tenantIds && tenantIds.length > 0) {
        resourceQuery = resourceQuery.in('azure_tenant_id', tenantIds);
      }

      const { data: resources, error: resourcesError } = await resourceQuery;
      if (resourcesError) throw resourcesError;

      // Count resources per group
      const resourceCountByGroup: Record<string, number> = {};
      (resources || []).forEach((r) => {
        const group = r.resource_group || 'Unknown';
        resourceCountByGroup[group] = (resourceCountByGroup[group] || 0) + 1;
      });

      // Aggregate costs by resource group
      const costByGroup: Record<string, number> = {};
      let totalCost = 0;

      allCostData.forEach((c) => {
        const group = c.resource_group || 'Unknown';
        const amount = parseFloat(String(c.cost_amount)) || 0;
        costByGroup[group] = (costByGroup[group] || 0) + amount;
        totalCost += amount;
      });

      // Sort and take top groups
      const sortedGroups = Object.entries(costByGroup)
        .sort(([, a], [, b]) => b - a);

      // Take top N and combine rest as "Other"
      const topGroups = sortedGroups.slice(0, limit);
      const otherCost = sortedGroups
        .slice(limit)
        .reduce((sum, [, cost]) => sum + cost, 0);
      const otherResourceCount = sortedGroups
        .slice(limit)
        .reduce((sum, [group]) => sum + (resourceCountByGroup[group] || 0), 0);

      const result: ResourceGroupCost[] = topGroups.map(([resourceGroup, cost]) => ({
        resourceGroup,
        cost,
        percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        resourceCount: resourceCountByGroup[resourceGroup] || 0,
      }));

      if (otherCost > 0) {
        result.push({
          resourceGroup: 'Other',
          cost: otherCost,
          percentage: totalCost > 0 ? (otherCost / totalCost) * 100 : 0,
          resourceCount: otherResourceCount,
        });
      }

      return result;
    },
  });
}
