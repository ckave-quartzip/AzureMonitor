import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CostSummary {
  total_cost: number;
  currency: string;
  by_category: Record<string, number>;
  record_count: number;
}

export interface CostTrendPoint {
  date: string;
  cost: number;
}

export interface ResourceCost {
  resource_id: string;
  resource_group: string;
  total_cost: number;
}

export function useAzureCostSummary(tenantId: string | undefined, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['azure-cost-summary', tenantId, startDate, endDate],
    queryFn: async () => {
      if (!tenantId) return null;

      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;

      // Default to 30-day rolling window ending at latest available data
      if (!startDate || !endDate) {
        const { data: latestDateResult } = await supabase
          .from('azure_cost_data')
          .select('usage_date')
          .eq('azure_tenant_id', tenantId)
          .order('usage_date', { ascending: false })
          .limit(1);
        
        if (latestDateResult?.[0]?.usage_date) {
          const latestDate = new Date(latestDateResult[0].usage_date);
          effectiveEndDate = latestDateResult[0].usage_date;
          effectiveStartDate = new Date(latestDate.getTime() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        } else {
          // No data available
          return null;
        }
      }

      const { data, error } = await supabase.functions.invoke('azure-costs', {
        body: {
          action: 'summary',
          tenantId,
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return {
        ...data,
        startDate: effectiveStartDate,
        endDate: effectiveEndDate,
      } as CostSummary & { startDate: string; endDate: string };
    },
    enabled: !!tenantId,
  });
}

export function useAzureCostTrend(
  tenantId?: string, 
  startDate?: string, 
  endDate?: string, 
  resourceGroup?: string,
  tenantIds?: string[]
) {
  return useQuery({
    queryKey: ['azure-cost-trend', tenantId ?? 'all', startDate, endDate, resourceGroup, tenantIds],
    queryFn: async () => {
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;
      
      // If no date range specified, use last 30 days ending at latest available data
      if (!startDate || !endDate) {
        const { data: latestDateResult } = await supabase
          .from('azure_cost_data')
          .select('usage_date')
          .order('usage_date', { ascending: false })
          .limit(1);
        
        if (latestDateResult?.[0]?.usage_date) {
          const latestDate = new Date(latestDateResult[0].usage_date);
          effectiveEndDate = latestDateResult[0].usage_date;
          effectiveStartDate = new Date(latestDate.getTime() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        } else {
          // No data, use today as fallback
          const now = new Date();
          effectiveEndDate = now.toISOString().split('T')[0];
          effectiveStartDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        }
      }
      
      // Fetch cost data directly from the database
      const COST_LIMIT = 10000;
      let query = supabase
        .from('azure_cost_data')
        .select('usage_date, cost_amount, azure_tenant_id')
        .gte('usage_date', effectiveStartDate!)
        .lte('usage_date', effectiveEndDate!)
        .order('usage_date', { ascending: true })
        .limit(COST_LIMIT);
      
      // Handle tenantIds array (multi-tenant filter)
      if (tenantIds && tenantIds.length > 0) {
        query = query.in('azure_tenant_id', tenantIds);
      } else if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }
      
      if (resourceGroup) {
        query = query.eq('resource_group', resourceGroup);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Aggregate by date
      const costByDate: Record<string, number> = {};
      (data || []).forEach((item) => {
        const date = item.usage_date;
        costByDate[date] = (costByDate[date] || 0) + (item.cost_amount || 0);
      });
      
      return Object.entries(costByDate)
        .map(([date, cost]) => ({ date, cost }))
        .sort((a, b) => a.date.localeCompare(b.date)) as CostTrendPoint[];
    },
  });
}

export function useAzureCostsByResource(
  tenantId?: string, 
  startDate?: string, 
  endDate?: string,
  tenantIds?: string[]
) {
  return useQuery({
    queryKey: ['azure-costs-by-resource', tenantId ?? 'all', startDate, endDate, tenantIds],
    queryFn: async () => {
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate;
      
      // If no date range specified, use last 30 days ending at latest available data
      if (!startDate || !endDate) {
        const { data: latestDateResult } = await supabase
          .from('azure_cost_data')
          .select('usage_date')
          .order('usage_date', { ascending: false })
          .limit(1);
        
        if (latestDateResult?.[0]?.usage_date) {
          const latestDate = new Date(latestDateResult[0].usage_date);
          effectiveEndDate = latestDateResult[0].usage_date;
          effectiveStartDate = new Date(latestDate.getTime() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        } else {
          const now = new Date();
          effectiveEndDate = now.toISOString().split('T')[0];
          effectiveStartDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        }
      }
      
      // Fetch cost data directly from the database and aggregate by resource
      const COST_LIMIT = 10000;
      let query = supabase
        .from('azure_cost_data')
        .select('azure_resource_id, resource_group, cost_amount, azure_tenant_id')
        .gte('usage_date', effectiveStartDate!)
        .lte('usage_date', effectiveEndDate!)
        .limit(COST_LIMIT);
      
      // Handle tenantIds array (multi-tenant filter)
      if (tenantIds && tenantIds.length > 0) {
        query = query.in('azure_tenant_id', tenantIds);
      } else if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Aggregate by resource
      const costByResource: Record<string, { resource_group: string; total_cost: number }> = {};
      (data || []).forEach((item) => {
        const resourceId = item.azure_resource_id || 'unknown';
        if (!costByResource[resourceId]) {
          costByResource[resourceId] = {
            resource_group: item.resource_group || '',
            total_cost: 0,
          };
        }
        costByResource[resourceId].total_cost += item.cost_amount || 0;
      });
      
      return Object.entries(costByResource)
        .map(([resource_id, data]) => ({
          resource_id,
          resource_group: data.resource_group,
          total_cost: data.total_cost,
        }))
        .sort((a, b) => b.total_cost - a.total_cost) as ResourceCost[];
    },
  });
}
