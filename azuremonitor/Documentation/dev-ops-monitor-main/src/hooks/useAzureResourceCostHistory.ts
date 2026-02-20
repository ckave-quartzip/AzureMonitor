import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CostHistoryPoint {
  date: string;
  cost: number;
}

export interface CostBreakdown {
  category: string;
  cost: number;
}

export interface AzureResourceCostHistory {
  dailyCosts: CostHistoryPoint[];
  costByCategory: CostBreakdown[];
  totalCost: number;
  currency: string;
}

export function useAzureResourceCostHistory(azureResourceId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: ['azure-resource-cost-history', azureResourceId, days],
    queryFn: async () => {
      if (!azureResourceId) {
        return {
          dailyCosts: [],
          costByCategory: [],
          totalCost: 0,
          currency: 'USD',
        };
      }

      // First, get the azure_resource_id (full path) for this resource
      const { data: resource } = await (supabase
        .from('azure_resources' as any)
        .select('azure_resource_id')
        .eq('id', azureResourceId)
        .maybeSingle() as any);

      if (!resource?.azure_resource_id) {
        return {
          dailyCosts: [],
          costByCategory: [],
          totalCost: 0,
          currency: 'USD',
        };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch cost data using the full azure resource path (case-insensitive)
      const { data: costs, error } = await (supabase
        .from('azure_cost_data' as any)
        .select('usage_date, cost_amount, currency, meter_category')
        .ilike('azure_resource_id', resource.azure_resource_id)
        .gte('usage_date', startDateStr)
        .order('usage_date', { ascending: true }) as any);

      if (error) throw error;

      // Aggregate daily costs
      const dailyCostMap: Record<string, number> = {};
      const categoryMap: Record<string, number> = {};
      let totalCost = 0;
      let currency = 'USD';

      (costs || []).forEach((c: any) => {
        const amount = parseFloat(c.cost_amount) || 0;
        const date = c.usage_date;
        const category = c.meter_category || 'Other';
        
        dailyCostMap[date] = (dailyCostMap[date] || 0) + amount;
        categoryMap[category] = (categoryMap[category] || 0) + amount;
        totalCost += amount;
        
        if (c.currency) currency = c.currency;
      });

      // Convert to arrays
      const dailyCosts: CostHistoryPoint[] = Object.entries(dailyCostMap)
        .map(([date, cost]) => ({ date, cost }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const costByCategory: CostBreakdown[] = Object.entries(categoryMap)
        .map(([category, cost]) => ({ category, cost }))
        .sort((a, b) => b.cost - a.cost);

      return {
        dailyCosts,
        costByCategory,
        totalCost,
        currency,
      } as AzureResourceCostHistory;
    },
    enabled: !!azureResourceId,
  });
}
