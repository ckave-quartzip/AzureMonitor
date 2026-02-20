import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SpikeDayResource {
  resourceId: string;
  internalId: string | null; // The UUID from azure_resources table for navigation
  resourceName: string | null;
  resourceGroup: string;
  meterCategory: string;
  cost: number;
  percentOfTotal: number;
}

export interface SpikeDayDetail {
  date: string;
  totalCost: number;
  topResources: SpikeDayResource[];
  byCategory: Array<{ category: string; cost: number; percent: number }>;
}

export function useSpikeDayDetail(
  date: string | null,
  tenantId?: string
) {
  return useQuery({
    queryKey: ['spike-day-detail', date, tenantId],
    queryFn: async (): Promise<SpikeDayDetail> => {
      if (!date) throw new Error('No date provided');

      let query = supabase
        .from('azure_cost_data')
        .select('azure_resource_id, resource_group, meter_category, cost_amount')
        .eq('usage_date', date)
        .order('cost_amount', { ascending: false })
        .limit(500);

      if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const records = data || [];
      const totalCost = records.reduce((sum, r) => sum + (r.cost_amount || 0), 0);

      // Aggregate by resource
      const byResource: Record<string, { resourceGroup: string; meterCategory: string; cost: number }> = {};
      const byCategory: Record<string, number> = {};

      records.forEach((r) => {
        const resId = r.azure_resource_id || 'Unknown';
        if (!byResource[resId]) {
          byResource[resId] = {
            resourceGroup: r.resource_group || 'Unknown',
            meterCategory: r.meter_category || 'Unknown',
            cost: 0,
          };
        }
        byResource[resId].cost += r.cost_amount || 0;

        const cat = r.meter_category || 'Unknown';
        byCategory[cat] = (byCategory[cat] || 0) + (r.cost_amount || 0);
      });

      // Get unique azure_resource_ids to look up internal IDs
      const uniqueAzureResourceIds = Object.keys(byResource).filter(id => id !== 'Unknown');
      
      // Look up internal IDs from azure_resources table
      let resourceLookup: Record<string, { id: string; name: string }> = {};
      if (uniqueAzureResourceIds.length > 0) {
        const { data: azureResources } = await supabase
          .from('azure_resources')
          .select('id, azure_resource_id, name')
          .in('azure_resource_id', uniqueAzureResourceIds);
        
        if (azureResources) {
          azureResources.forEach((r) => {
            resourceLookup[r.azure_resource_id] = { id: r.id, name: r.name };
          });
        }
      }

      const topResources: SpikeDayResource[] = Object.entries(byResource)
        .map(([resourceId, data]) => ({
          resourceId,
          internalId: resourceLookup[resourceId]?.id || null,
          resourceName: resourceLookup[resourceId]?.name || null,
          resourceGroup: data.resourceGroup,
          meterCategory: data.meterCategory,
          cost: data.cost,
          percentOfTotal: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 10);

      const categoryBreakdown = Object.entries(byCategory)
        .map(([category, cost]) => ({
          category,
          cost,
          percent: totalCost > 0 ? (cost / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 8);

      return {
        date,
        totalCost,
        topResources,
        byCategory: categoryBreakdown,
      };
    },
    enabled: !!date,
  });
}
