import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CostCategory {
  category: string;
  cost: number;
  percentage: number;
}

export function useCostByCategory(limit: number = 5, tenantIds?: string[]) {
  return useQuery({
    queryKey: ['cost-by-category', limit, tenantIds],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      // Fetch current month costs with meter_category using pagination
      const BATCH_SIZE = 1000;
      let allCostData: any[] = [];
      let offset = 0;

      while (true) {
        let query = supabase
          .from('azure_cost_data')
          .select('meter_category, cost_amount')
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

      // Aggregate costs by category
      const costByCategory: Record<string, number> = {};
      let totalCost = 0;

      allCostData.forEach((c) => {
        const category = c.meter_category || 'Uncategorized';
        const amount = parseFloat(String(c.cost_amount)) || 0;
        costByCategory[category] = (costByCategory[category] || 0) + amount;
        totalCost += amount;
      });

      // Sort and take top categories
      const sortedCategories = Object.entries(costByCategory)
        .sort(([, a], [, b]) => b - a);

      // Take top N and combine rest as "Other"
      const topCategories = sortedCategories.slice(0, limit);
      const otherCost = sortedCategories
        .slice(limit)
        .reduce((sum, [, cost]) => sum + cost, 0);

      const result: CostCategory[] = topCategories.map(([category, cost]) => ({
        category,
        cost,
        percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      }));

      if (otherCost > 0) {
        result.push({
          category: 'Other',
          cost: otherCost,
          percentage: totalCost > 0 ? (otherCost / totalCost) * 100 : 0,
        });
      }

      return result;
    },
  });
}
