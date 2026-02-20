import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAzureTenants } from './useAzureTenants';
import { startOfMonth, format } from 'date-fns';

export interface AzureDashboardStats {
  totalResources: number;
  resourcesByType: Record<string, number>;
  totalMonthlyCost: number;
  costCurrency: string;
  costByCategory: Record<string, number>;
  resourcesWithIssues: number;
  tenantCount: number;
  lastSyncAt: string | null;
}

export function useAzureDashboardStats() {
  const { data: tenants } = useAzureTenants();
  
  return useQuery({
    queryKey: ['azure-dashboard-stats', tenants?.map(t => t.id)],
    queryFn: async (): Promise<AzureDashboardStats> => {
      // Get total Azure resources count and types
      const { data: resources, error: resourcesError } = await supabase
        .from('azure_resources')
        .select('id, resource_type');
      
      if (resourcesError) throw resourcesError;
      
      // Group resources by type
      const resourcesByType: Record<string, number> = {};
      resources?.forEach(r => {
        const type = r.resource_type.split('/').pop() || r.resource_type;
        resourcesByType[type] = (resourcesByType[type] || 0) + 1;
      });
      
      // Use RPC function to get aggregated cost stats (avoids 1000 row limit)
      const { data: costStats } = await supabase
        .rpc('get_rolling_cost_stats', { p_days_back: 30 });
      
      const totalMonthlyCost = costStats?.[0]?.current_period_total || 0;
      const costCurrency = 'USD';
      
      // Get cost by category using pagination to bypass 1000 row limit
      const startDateStr = costStats?.[0]?.current_period_start || format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endDateStr = costStats?.[0]?.current_period_end || format(new Date(), 'yyyy-MM-dd');
      
      let allCostData: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        const { data: batch } = await supabase
          .from('azure_cost_data')
          .select('cost_amount, currency, meter_category')
          .gte('usage_date', startDateStr)
          .lte('usage_date', endDateStr)
          .range(offset, offset + batchSize - 1);
        
        if (!batch || batch.length === 0) break;
        allCostData = allCostData.concat(batch);
        offset += batchSize;
        if (batch.length < batchSize) break;
      }
      
      // Calculate cost by category
      const costByCategory: Record<string, number> = {};
      allCostData.forEach(c => {
        if (c.meter_category) {
          costByCategory[c.meter_category] = (costByCategory[c.meter_category] || 0) + (c.cost_amount || 0);
        }
      });
      
      // Get resources with high CPU/memory from latest metrics
      const METRICS_LIMIT = 2000;
      const { data: metricsData, error: metricsError } = await supabase
        .from('azure_metrics')
        .select('azure_resource_id, metric_name, average')
        .in('metric_name', ['cpu_percent', 'memory_percent', 'dtu_consumption_percent', 'Percentage CPU'])
        .gte('average', 80)
        .limit(METRICS_LIMIT);
      
      const resourcesWithIssues = new Set(metricsData?.map(m => m.azure_resource_id)).size;
      
      // Get latest sync time
      const lastSyncAt = tenants?.reduce((latest, t) => {
        if (!t.last_sync_at) return latest;
        if (!latest) return t.last_sync_at;
        return new Date(t.last_sync_at) > new Date(latest) ? t.last_sync_at : latest;
      }, null as string | null) || null;
      
      return {
        totalResources: resources?.length || 0,
        resourcesByType,
        totalMonthlyCost,
        costCurrency,
        costByCategory,
        resourcesWithIssues: resourcesWithIssues || 0,
        tenantCount: tenants?.length || 0,
        lastSyncAt,
      };
    },
    enabled: !!tenants && tenants.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAzureResourceCost(azureResourceId: string | undefined) {
  return useQuery({
    queryKey: ['azure-resource-cost', azureResourceId],
    queryFn: async () => {
      if (!azureResourceId) return null;
      
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('azure_cost_data')
        .select('cost_amount, currency, usage_date')
        .eq('azure_resource_id', azureResourceId)
        .gte('usage_date', monthStart)
        .order('usage_date', { ascending: true });
      
      if (error) throw error;
      
      const totalCost = data?.reduce((sum, d) => sum + (d.cost_amount || 0), 0) || 0;
      const currency = data?.[0]?.currency || 'USD';
      
      // Group by date for trend
      const costTrend = data?.map(d => ({
        date: d.usage_date,
        cost: d.cost_amount,
      })) || [];
      
      return {
        totalCost,
        currency,
        costTrend,
      };
    },
    enabled: !!azureResourceId,
  });
}
