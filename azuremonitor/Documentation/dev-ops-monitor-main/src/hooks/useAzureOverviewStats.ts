import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResourceTypeStats {
  count: number;
  cost: number;
  fullType: string;
}

export interface AzureOverviewStats {
  totalTenants: number;
  enabledTenants: number;
  totalResources: number;
  resourcesByType: Record<string, ResourceTypeStats>;
  monthlySpend: number;
  lastMonthSpend: number;
  spendChange: number;
  costPeriodStart: string | null;
  costPeriodEnd: string | null;
  healthyResources: number;
  warningResources: number;
  criticalResources: number;
  recentSyncs: Array<{
    id: string;
    tenant_name: string;
    sync_type: string;
    status: string;
    started_at: string;
    completed_at: string | null;
  }>;
}

export function useAzureOverviewStats(tenantIds?: string[]) {
  return useQuery({
    queryKey: ['azure-overview-stats', tenantIds],
    queryFn: async () => {
      // Fetch tenants
      const { data: tenants, error: tenantsError } = await (supabase
        .from('azure_tenants' as any)
        .select('id, name, is_enabled') as any);

      if (tenantsError) throw tenantsError;

      // Filter tenants if tenantIds provided
      const filteredTenants = tenantIds && tenantIds.length > 0
        ? (tenants || []).filter((t: any) => tenantIds.includes(t.id))
        : tenants || [];

      const tenantIdsToFilter = tenantIds && tenantIds.length > 0 
        ? tenantIds 
        : null;

      // Fetch resources with azure_resource_id for joining with cost data
      let resourcesQuery = supabase
        .from('azure_resources' as any)
        .select('id, resource_type, name, azure_resource_id, azure_tenant_id') as any;

      if (tenantIdsToFilter) {
        resourcesQuery = resourcesQuery.in('azure_tenant_id', tenantIdsToFilter);
      }

      const { data: resources, error: resourcesError } = await resourcesQuery;

      if (resourcesError) throw resourcesError;

      // Use RPC function to get aggregated cost stats (avoids 1000 row limit)
      // RPC now supports optional tenant filtering for consistent results
      const { data: costStats, error: costStatsError } = await supabase
        .rpc('get_rolling_cost_stats', { 
          p_days_back: 30,
          p_tenant_ids: tenantIdsToFilter || null
        });
      
      if (costStatsError) {
        console.error('[AzureOverviewStats] Cost stats RPC error:', costStatsError);
      }
      
      const monthlySpend = costStats?.[0]?.current_period_total || 0;
      const lastMonthSpend = costStats?.[0]?.previous_period_total || 0;
      const costPeriodStart = costStats?.[0]?.current_period_start || null;
      const costPeriodEnd = costStats?.[0]?.current_period_end || null;

      const spendChange = lastMonthSpend > 0 
        ? ((monthlySpend - lastMonthSpend) / lastMonthSpend) * 100 
        : 0;
      
      console.log('[AzureOverviewStats] Cost stats:', {
        monthlySpend,
        lastMonthSpend,
        spendChange,
        costPeriodStart,
        costPeriodEnd,
        filtered: !!tenantIdsToFilter
      });
      
      // Fetch costs with azure_resource_id to calculate per-type costs
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];
      const endDateStr = now.toISOString().split('T')[0];
      
      // Fetch in batches to bypass 1000 row limit
      let allCurrentCosts: any[] = [];
      let offset = 0;
      const batchSize = 1000;
      
      while (true) {
        let batchQuery = supabase
          .from('azure_cost_data' as any)
          .select('cost_amount, azure_resource_id')
          .gte('usage_date', startDateStr)
          .lte('usage_date', endDateStr)
          .range(offset, offset + batchSize - 1) as any;

        if (tenantIdsToFilter) {
          batchQuery = batchQuery.in('azure_tenant_id', tenantIdsToFilter);
        }
        
        const { data: batch } = await batchQuery;
        
        if (!batch || batch.length === 0) break;
        allCurrentCosts = allCurrentCosts.concat(batch);
        offset += batchSize;
        if (batch.length < batchSize) break; // Last batch
      }

      // Build azure_resource_id (full path) to type mapping (case-insensitive)
      const azureResourceIdToType: Record<string, string> = {};
      (resources || []).forEach((r: any) => {
        // Store with lowercase key for case-insensitive matching
        azureResourceIdToType[r.azure_resource_id.toLowerCase()] = r.resource_type;
      });

      // Count resources by type and accumulate costs
      const resourcesByType: Record<string, ResourceTypeStats> = {};
      (resources || []).forEach((r: any) => {
        const shortType = r.resource_type.split('/').pop() || r.resource_type;
        if (!resourcesByType[shortType]) {
          resourcesByType[shortType] = { count: 0, cost: 0, fullType: r.resource_type };
        }
        resourcesByType[shortType].count += 1;
      });

      // Add cost data to resource types (case-insensitive matching)
      (allCurrentCosts || []).forEach((c: any) => {
        if (c.azure_resource_id) {
          const fullType = azureResourceIdToType[c.azure_resource_id.toLowerCase()];
          if (fullType) {
            const shortType = fullType.split('/').pop() || fullType;
            if (resourcesByType[shortType]) {
              resourcesByType[shortType].cost += parseFloat(c.cost_amount) || 0;
            }
          }
        }
      });

      // Fetch metrics to determine health (simplified - check for high CPU/DTU)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Get resource IDs for filtered tenants
      const resourceIds = (resources || []).map((r: any) => r.id);
      
      let metricsQuery = supabase
        .from('azure_metrics' as any)
        .select('azure_resource_id, metric_name, average')
        .gte('timestamp_utc', oneDayAgo)
        .in('metric_name', ['Percentage CPU', 'dtu_consumption_percent', 'cpu_percent']) as any;

      if (tenantIdsToFilter && resourceIds.length > 0) {
        metricsQuery = metricsQuery.in('azure_resource_id', resourceIds);
      }

      const { data: recentMetrics } = await metricsQuery;

      // Group metrics by resource and check for issues
      const resourceHealth: Record<string, 'healthy' | 'warning' | 'critical'> = {};
      (recentMetrics || []).forEach((m: any) => {
        const avg = parseFloat(m.average) || 0;
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        
        if (avg > 90) status = 'critical';
        else if (avg > 70) status = 'warning';
        
        const currentStatus = resourceHealth[m.azure_resource_id];
        if (!currentStatus || 
            (status === 'critical') || 
            (status === 'warning' && currentStatus === 'healthy')) {
          resourceHealth[m.azure_resource_id] = status;
        }
      });

      const healthCounts = Object.values(resourceHealth).reduce(
        (acc, status) => {
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        { healthy: 0, warning: 0, critical: 0 } as Record<string, number>
      );

      // Resources without metrics are considered healthy
      const resourcesWithMetrics = Object.keys(resourceHealth).length;
      const resourcesWithoutMetrics = (resources?.length || 0) - resourcesWithMetrics;
      healthCounts.healthy += resourcesWithoutMetrics;

      // Fetch recent sync logs
      let syncLogsQuery = supabase
        .from('azure_sync_logs' as any)
        .select(`
          id,
          azure_tenant_id,
          sync_type,
          status,
          started_at,
          completed_at
        `)
        .order('started_at', { ascending: false })
        .limit(10) as any;

      if (tenantIdsToFilter) {
        syncLogsQuery = syncLogsQuery.in('azure_tenant_id', tenantIdsToFilter);
      }

      const { data: syncLogs } = await syncLogsQuery;

      // Map tenant names to sync logs
      const tenantMap = new Map((tenants || []).map((t: any) => [t.id, t.name]));
      const recentSyncs = (syncLogs || []).map((s: any) => ({
        ...s,
        tenant_name: tenantMap.get(s.azure_tenant_id) || 'Unknown',
      }));

      return {
        totalTenants: filteredTenants.length,
        enabledTenants: filteredTenants.filter((t: any) => t.is_enabled).length,
        totalResources: resources?.length || 0,
        resourcesByType,
        monthlySpend,
        lastMonthSpend,
        spendChange,
        costPeriodStart,
        costPeriodEnd,
        healthyResources: healthCounts.healthy,
        warningResources: healthCounts.warning,
        criticalResources: healthCounts.critical,
        recentSyncs,
      } as AzureOverviewStats;
    },
  });
}
