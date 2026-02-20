import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SqlIssues {
  deadlocks: number;
  blocked: number;
  highDtu: number;
  missingIndexes: number;
}

export interface PerformanceIssue {
  name: string;
  resourceType: string;
  metric: string;
  value: number;
}

export interface UnderutilizedResource {
  id: string;
  name: string;
  resourceType: string;
  avgUsage: number;
  monthlyCost: number;
}

export interface AzureCriticalAlerts {
  // SQL Issues
  sqlHealthScore: number;
  sqlDatabaseCount: number;
  sqlIssues: SqlIssues;
  
  // Performance Issues
  performance: {
    highCpuCount: number;
    criticalCount: number;
    resources: PerformanceIssue[];
  };
  
  // Cost Alerts
  costAlerts: {
    activeCount: number;
    criticalCount: number;
    totalOverThreshold: number;
    currency: string;
  };
  
  // Underutilized Resources (High cost + Low usage)
  underutilized: {
    count: number;
    potentialSavings: number;
    currency: string;
    resources: UnderutilizedResource[];
  };
  
  // Overall severity
  overallSeverity: 'healthy' | 'warning' | 'critical';
  totalIssues: number;
  hasData: boolean;
}

function calculateSqlHealthScore(
  avgDtu: number | null,
  avgCpu: number | null,
  deadlocks: number,
  blocked: number,
  topWaitTimeMs: number
): number {
  let score = 100;

  // DTU/CPU utilization penalty
  const utilization = avgDtu ?? avgCpu ?? 0;
  if (utilization > 90) score -= 40;
  else if (utilization > 80) score -= 25;
  else if (utilization > 70) score -= 10;

  // Deadlock penalty
  if (deadlocks > 10) score -= 30;
  else if (deadlocks > 5) score -= 20;
  else if (deadlocks > 0) score -= 10;

  // Blocked processes penalty
  if (blocked > 20) score -= 20;
  else if (blocked > 10) score -= 10;
  else if (blocked > 0) score -= 5;

  // Wait stats penalty
  const waitTimeSeconds = topWaitTimeMs / 1000;
  if (waitTimeSeconds > 10000) score -= 15;
  else if (waitTimeSeconds > 5000) score -= 10;
  else if (waitTimeSeconds > 1000) score -= 5;

  return Math.max(0, score);
}

export function useAzureCriticalAlerts() {
  return useQuery({
    queryKey: ['azure-critical-alerts'],
    queryFn: async (): Promise<AzureCriticalAlerts> => {
      // Check if there are any Azure tenants
      const { data: tenants } = await supabase
        .from('azure_tenants')
        .select('id')
        .eq('is_enabled', true)
        .limit(1);

      if (!tenants || tenants.length === 0) {
        return {
          sqlHealthScore: 100,
          sqlDatabaseCount: 0,
          sqlIssues: { deadlocks: 0, blocked: 0, highDtu: 0, missingIndexes: 0 },
          performance: { highCpuCount: 0, criticalCount: 0, resources: [] },
          costAlerts: { activeCount: 0, criticalCount: 0, totalOverThreshold: 0, currency: 'USD' },
          underutilized: { count: 0, potentialSavings: 0, currency: 'USD', resources: [] },
          overallSeverity: 'healthy',
          totalIssues: 0,
          hasData: false,
        };
      }

      // === SQL Health ===
      const { data: sqlResources } = await supabase
        .from('azure_resources')
        .select('id, name, resource_type')
        .or('resource_type.ilike.%sql%,resource_type.ilike.%database%');

      const sqlResourceIds = sqlResources?.map(r => r.id) || [];
      let sqlHealthScore = 100;
      let deadlocks = 0;
      let blocked = 0;
      let highDtu = 0;
      let topWaitTimeMs = 0;

      if (sqlResourceIds.length > 0) {
        // Get performance stats
        const { data: perfStats } = await supabase
          .from('azure_sql_performance_stats')
          .select('azure_resource_id, dtu_percent, cpu_percent, deadlock_count, blocked_count')
          .in('azure_resource_id', sqlResourceIds)
          .order('timestamp_utc', { ascending: false });

        // Latest per resource
        const latestByResource = new Map<string, typeof perfStats extends (infer T)[] ? T : never>();
        perfStats?.forEach(stat => {
          if (stat.azure_resource_id && !latestByResource.has(stat.azure_resource_id)) {
            latestByResource.set(stat.azure_resource_id, stat);
          }
        });

        const latestPerf = Array.from(latestByResource.values());
        const avgDtu = latestPerf.length > 0
          ? latestPerf.reduce((sum, s) => sum + (s.dtu_percent || 0), 0) / latestPerf.length
          : null;
        const avgCpu = latestPerf.length > 0
          ? latestPerf.reduce((sum, s) => sum + (s.cpu_percent || 0), 0) / latestPerf.length
          : null;
        highDtu = latestPerf.filter(s => (s.dtu_percent || s.cpu_percent || 0) > 80).length;
        deadlocks = latestPerf.reduce((sum, s) => sum + (s.deadlock_count || 0), 0);
        blocked = latestPerf.reduce((sum, s) => sum + (s.blocked_count || 0), 0);

        // Get wait stats
        const { data: waitStats } = await supabase
          .from('azure_sql_wait_stats')
          .select('wait_time_ms')
          .in('azure_resource_id', sqlResourceIds)
          .order('wait_time_ms', { ascending: false })
          .limit(1);

        topWaitTimeMs = waitStats?.[0]?.wait_time_ms || 0;

        sqlHealthScore = calculateSqlHealthScore(avgDtu, avgCpu, deadlocks, blocked, topWaitTimeMs);
      }

      // Get missing indexes count
      const { count: missingIndexesCount } = await supabase
        .from('azure_sql_recommendations')
        .select('*', { count: 'exact', head: true })
        .eq('is_resolved', false)
        .ilike('category', '%index%');

      // === Performance Issues (from azure_metrics) ===
      const { data: highUtilResources } = await supabase
        .from('azure_metrics')
        .select('azure_resource_id, metric_name, average')
        .or('metric_name.ilike.%cpu%,metric_name.ilike.%dtu%')
        .gt('average', 80)
        .order('average', { ascending: false })
        .limit(20);

      const highPerfResourceIds = [...new Set(highUtilResources?.map(r => r.azure_resource_id) || [])];
      let performanceResources: PerformanceIssue[] = [];
      
      if (highPerfResourceIds.length > 0) {
        const { data: resourceDetails } = await supabase
          .from('azure_resources')
          .select('id, name, resource_type')
          .in('id', highPerfResourceIds);

        const resourceMap = new Map(resourceDetails?.map(r => [r.id, r]) || []);
        
        // Deduplicate by resource
        const seenResources = new Set<string>();
        performanceResources = (highUtilResources || [])
          .filter(m => {
            if (seenResources.has(m.azure_resource_id)) return false;
            seenResources.add(m.azure_resource_id);
            return true;
          })
          .map(m => {
            const resource = resourceMap.get(m.azure_resource_id);
            return {
              name: resource?.name || 'Unknown',
              resourceType: resource?.resource_type || 'Unknown',
              metric: m.metric_name,
              value: m.average || 0,
            };
          })
          .slice(0, 5);
      }

      const highCpuCount = performanceResources.length;
      const criticalCount = performanceResources.filter(r => r.value > 90).length;

      // === Cost Alerts ===
      const { data: costAlerts } = await supabase
        .from('azure_cost_alerts')
        .select('severity, current_cost, threshold_amount')
        .is('resolved_at', null);

      const activeCostAlerts = costAlerts || [];
      const criticalCostAlerts = activeCostAlerts.filter(a => a.severity === 'critical').length;
      const totalOverThreshold = activeCostAlerts.reduce(
        (sum, a) => sum + Math.max(0, a.current_cost - a.threshold_amount),
        0
      );

      // === Underutilized Resources ===
      // Get resources with their costs and metrics
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Get monthly costs per resource
      const { data: costData } = await supabase
        .from('azure_cost_data')
        .select('azure_resource_id, cost_amount, currency')
        .gte('usage_date', `${currentMonth}-01`);

      // Aggregate costs by resource
      const costByResource = new Map<string, { total: number; currency: string }>();
      costData?.forEach(c => {
        if (c.azure_resource_id) {
          const existing = costByResource.get(c.azure_resource_id) || { total: 0, currency: c.currency };
          existing.total += c.cost_amount;
          costByResource.set(c.azure_resource_id, existing);
        }
      });

      // Get average metrics for resources with significant cost
      const expensiveResourceIds = Array.from(costByResource.entries())
        .filter(([_, cost]) => cost.total > 50)
        .map(([id]) => id);

      let underutilizedResources: UnderutilizedResource[] = [];
      let potentialSavings = 0;
      let underutilCurrency = 'USD';

      if (expensiveResourceIds.length > 0) {
        // Get recent metrics
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: metrics } = await supabase
          .from('azure_metrics')
          .select('azure_resource_id, average')
          .in('azure_resource_id', expensiveResourceIds)
          .or('metric_name.ilike.%cpu%,metric_name.ilike.%dtu%')
          .gte('timestamp_utc', sevenDaysAgo.toISOString());

        // Calculate average usage per resource
        const usageByResource = new Map<string, { total: number; count: number }>();
        metrics?.forEach(m => {
          if (m.azure_resource_id) {
            const existing = usageByResource.get(m.azure_resource_id) || { total: 0, count: 0 };
            existing.total += m.average || 0;
            existing.count += 1;
            usageByResource.set(m.azure_resource_id, existing);
          }
        });

        // Find underutilized: avg < 20% AND cost > $50
        const underutilizedIds = Array.from(usageByResource.entries())
          .filter(([id, usage]) => {
            const avgUsage = usage.count > 0 ? usage.total / usage.count : 0;
            return avgUsage < 20;
          })
          .map(([id]) => id);

        if (underutilizedIds.length > 0) {
          const { data: resourceDetails } = await supabase
            .from('azure_resources')
            .select('id, name, resource_type')
            .in('id', underutilizedIds);

          underutilizedResources = (resourceDetails || [])
            .map(r => {
              const cost = costByResource.get(r.id);
              const usage = usageByResource.get(r.id);
              const avgUsage = usage?.count ? usage.total / usage.count : 0;
              underutilCurrency = cost?.currency || 'USD';
              return {
                id: r.id,
                name: r.name,
                resourceType: r.resource_type,
                avgUsage: Math.round(avgUsage),
                monthlyCost: cost?.total || 0,
              };
            })
            .sort((a, b) => b.monthlyCost - a.monthlyCost)
            .slice(0, 10);

          // Potential savings = 50% of underutilized resource costs
          potentialSavings = underutilizedResources.reduce((sum, r) => sum + r.monthlyCost * 0.5, 0);
        }
      }

      // === Calculate overall severity ===
      const sqlIssueCount = deadlocks + blocked + highDtu + (missingIndexesCount || 0);
      const totalIssues = sqlIssueCount + highCpuCount + activeCostAlerts.length + underutilizedResources.length;

      let overallSeverity: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (criticalCount > 0 || criticalCostAlerts > 0 || sqlHealthScore < 60) {
        overallSeverity = 'critical';
      } else if (totalIssues > 0 || sqlHealthScore < 80) {
        overallSeverity = 'warning';
      }

      return {
        sqlHealthScore,
        sqlDatabaseCount: sqlResourceIds.length,
        sqlIssues: {
          deadlocks,
          blocked,
          highDtu,
          missingIndexes: missingIndexesCount || 0,
        },
        performance: {
          highCpuCount,
          criticalCount,
          resources: performanceResources,
        },
        costAlerts: {
          activeCount: activeCostAlerts.length,
          criticalCount: criticalCostAlerts,
          totalOverThreshold,
          currency: 'USD',
        },
        underutilized: {
          count: underutilizedResources.length,
          potentialSavings,
          currency: underutilCurrency,
          resources: underutilizedResources,
        },
        overallSeverity,
        totalIssues,
        hasData: true,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
