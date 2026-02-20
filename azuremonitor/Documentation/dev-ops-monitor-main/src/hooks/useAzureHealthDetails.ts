import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeadlockDetail {
  resourceId: string;
  resourceName: string;
  count: number;
  lastOccurred: string;
}

export interface BlockedDetail {
  resourceId: string;
  resourceName: string;
  count: number;
  waitTimeMs: number;
}

export interface HighDtuDetail {
  resourceId: string;
  resourceName: string;
  dtuPercent: number;
  cpuPercent: number;
  storagePercent: number;
}

export interface MissingIndexDetail {
  id: string;
  resourceId: string;
  resourceName: string;
  tableName: string;
  impact: string;
  statement: string;
  category: string;
}

export interface HighCpuDetail {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  value: number;
  metric: string;
  trend: 'up' | 'down' | 'stable';
  location: string;
}

export interface CostAlertDetail {
  id: string;
  ruleName: string;
  resourceName: string | null;
  resourceGroup: string | null;
  threshold: number;
  current: number;
  severity: string;
  triggeredAt: string;
}

// Enhanced underutilization metrics
export interface MetricUsage {
  metricName: string;
  avgValue: number;
  maxValue: number;
  unit: string;
}

export interface RightsizingRecommendation {
  type: 'downsize' | 'deallocate' | 'reserved' | 'spot';
  title: string;
  description: string;
  estimatedSavings: number;
  savingsPercent: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface UnderutilizedDetail {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  resourceGroup: string;
  location: string;
  monthlyCost: number;
  potentialSavings: number;
  // Multi-metric analysis
  metrics: {
    cpu: MetricUsage | null;
    memory: MetricUsage | null;
    dtu: MetricUsage | null;
    storage: MetricUsage | null;
    network: MetricUsage | null;
  };
  // Configurable thresholds comparison
  thresholdAnalysis: {
    cpuUnderutilized: boolean;
    memoryUnderutilized: boolean;
    dtuUnderutilized: boolean;
    storageUnderutilized: boolean;
    metricsAnalyzed: number;
    metricsBelowThreshold: number;
  };
  // Rightsizing recommendations
  recommendations: RightsizingRecommendation[];
  underutilizationScore: number; // 0-100, higher = more underutilized
  sku: string | null;
}

// Configurable thresholds for underutilization detection
export interface UnderutilizationThresholds {
  cpu: number;        // Percentage below which CPU is considered underutilized
  memory: number;     // Percentage below which memory is considered underutilized
  dtu: number;        // Percentage below which DTU is considered underutilized
  storage: number;    // Percentage below which storage is considered underutilized
  minMonthlyCost: number; // Minimum monthly cost to consider for underutilization
  lookbackDays: number;   // Days to look back for usage metrics
}

export const DEFAULT_THRESHOLDS: UnderutilizationThresholds = {
  cpu: 20,
  memory: 30,
  dtu: 20,
  storage: 40,
  minMonthlyCost: 50,
  lookbackDays: 7,
};

export interface AzureHealthDetails {
  sql: {
    deadlocks: DeadlockDetail[];
    blocked: BlockedDetail[];
    highDtu: HighDtuDetail[];
    missingIndexes: MissingIndexDetail[];
  };
  performance: {
    highCpu: HighCpuDetail[];
  };
  costAlerts: {
    active: CostAlertDetail[];
  };
  underutilized: UnderutilizedDetail[];
  underutilizationStats: {
    totalResources: number;
    totalMonthlyCost: number;
    totalPotentialSavings: number;
    byRecommendationType: Record<string, { count: number; savings: number }>;
  };
  thresholds: UnderutilizationThresholds;
  summary: {
    sqlIssueCount: number;
    performanceIssueCount: number;
    costAlertCount: number;
    underutilizedCount: number;
    overallSeverity: 'healthy' | 'warning' | 'critical';
  };
}

// Map metric names to categories
function categorizeMetric(metricName: string): 'cpu' | 'memory' | 'dtu' | 'storage' | 'network' | null {
  const lower = metricName.toLowerCase();
  
  if (lower.includes('cpu') || lower === 'percentage cpu') return 'cpu';
  if (lower.includes('memory') || lower.includes('workingset')) return 'memory';
  if (lower.includes('dtu')) return 'dtu';
  if (lower.includes('storage') || lower.includes('capacity') || lower.includes('disk')) return 'storage';
  if (lower.includes('network') || lower.includes('ingress') || lower.includes('egress')) return 'network';
  
  return null;
}

// Calculate underutilization score (0-100, higher = more underutilized)
function calculateUnderutilizationScore(
  metrics: UnderutilizedDetail['metrics'],
  thresholds: UnderutilizationThresholds
): number {
  let score = 0;
  let weightTotal = 0;
  
  // CPU has highest weight
  if (metrics.cpu) {
    const cpuScore = Math.max(0, (thresholds.cpu - metrics.cpu.avgValue) / thresholds.cpu * 100);
    score += cpuScore * 3;
    weightTotal += 3;
  }
  
  // DTU for SQL resources
  if (metrics.dtu) {
    const dtuScore = Math.max(0, (thresholds.dtu - metrics.dtu.avgValue) / thresholds.dtu * 100);
    score += dtuScore * 3;
    weightTotal += 3;
  }
  
  // Memory
  if (metrics.memory) {
    const memScore = Math.max(0, (thresholds.memory - metrics.memory.avgValue) / thresholds.memory * 100);
    score += memScore * 2;
    weightTotal += 2;
  }
  
  // Storage (lower weight)
  if (metrics.storage) {
    const storScore = Math.max(0, (thresholds.storage - metrics.storage.avgValue) / thresholds.storage * 100);
    score += storScore * 1;
    weightTotal += 1;
  }
  
  return weightTotal > 0 ? Math.min(100, Math.round(score / weightTotal)) : 0;
}

// Generate rightsizing recommendations based on metrics and resource type
function generateRecommendations(
  resource: { resource_type: string; sku: any; name: string },
  metrics: UnderutilizedDetail['metrics'],
  thresholds: UnderutilizationThresholds,
  monthlyCost: number
): RightsizingRecommendation[] {
  const recommendations: RightsizingRecommendation[] = [];
  const resourceType = resource.resource_type.toLowerCase();
  
  const cpuAvg = metrics.cpu?.avgValue ?? metrics.dtu?.avgValue ?? null;
  const cpuMax = metrics.cpu?.maxValue ?? metrics.dtu?.maxValue ?? null;
  
  // Very low utilization - suggest deallocation for dev/test
  if (cpuAvg !== null && cpuAvg < 5 && cpuMax !== null && cpuMax < 20) {
    recommendations.push({
      type: 'deallocate',
      title: 'Consider Deallocation',
      description: `This resource shows very low utilization (avg ${cpuAvg.toFixed(1)}%, max ${cpuMax.toFixed(1)}%). If it's a dev/test environment, consider deallocating during off-hours or using auto-shutdown.`,
      estimatedSavings: monthlyCost * 0.7, // Assume 70% savings with deallocation schedule
      savingsPercent: 70,
      confidence: cpuMax < 10 ? 'high' : 'medium',
    });
  }
  
  // Low utilization - suggest downsize
  if (cpuAvg !== null && cpuAvg < thresholds.cpu && cpuMax !== null && cpuMax < 60) {
    const skuInfo = resource.sku as any;
    const currentTier = skuInfo?.tier || skuInfo?.name || 'current tier';
    
    // Determine savings based on how underutilized
    const savingsPercent = cpuAvg < 10 ? 50 : cpuAvg < 15 ? 35 : 25;
    
    recommendations.push({
      type: 'downsize',
      title: 'Downsize to Smaller SKU',
      description: `Current usage (avg ${cpuAvg.toFixed(1)}%) suggests this resource can be downsized from ${currentTier}. Consider moving to a smaller tier while monitoring peak usage.`,
      estimatedSavings: monthlyCost * (savingsPercent / 100),
      savingsPercent,
      confidence: cpuMax < 40 ? 'high' : cpuAvg < 10 ? 'high' : 'medium',
    });
  }
  
  // For VMs and databases - suggest reserved instances
  if ((resourceType.includes('virtualmachines') || resourceType.includes('sql')) && monthlyCost > 100) {
    const reservedSavings = resourceType.includes('sql') ? 40 : 35;
    recommendations.push({
      type: 'reserved',
      title: 'Consider Reserved Capacity',
      description: `For predictable workloads, Azure Reserved Instances can save up to ${reservedSavings}% compared to pay-as-you-go pricing. Requires 1 or 3 year commitment.`,
      estimatedSavings: monthlyCost * (reservedSavings / 100),
      savingsPercent: reservedSavings,
      confidence: 'medium',
    });
  }
  
  // For VMs with low utilization - suggest spot instances for non-critical
  if (resourceType.includes('virtualmachines') && cpuAvg !== null && cpuAvg < 30) {
    recommendations.push({
      type: 'spot',
      title: 'Use Spot VMs for Batch Workloads',
      description: 'If this workload can tolerate interruptions, Azure Spot VMs offer up to 90% savings. Best for batch processing, dev/test, and fault-tolerant applications.',
      estimatedSavings: monthlyCost * 0.6, // Conservative spot estimate
      savingsPercent: 60,
      confidence: 'low',
    });
  }
  
  // Memory-specific recommendations
  if (metrics.memory && metrics.memory.avgValue < thresholds.memory && metrics.memory.maxValue < 50) {
    recommendations.push({
      type: 'downsize',
      title: 'Memory Oversized',
      description: `Memory utilization is low (avg ${metrics.memory.avgValue.toFixed(1)}%). Consider a VM series with less memory but similar CPU, or a burstable instance.`,
      estimatedSavings: monthlyCost * 0.2,
      savingsPercent: 20,
      confidence: 'medium',
    });
  }
  
  return recommendations;
}

export function useAzureHealthDetails(customThresholds?: Partial<UnderutilizationThresholds>) {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  
  return useQuery({
    queryKey: ['azure-health-details', thresholds],
    queryFn: async (): Promise<AzureHealthDetails> => {
      // Get all SQL resources
      const { data: sqlResources } = await supabase
        .from('azure_resources')
        .select('id, name, resource_type, resource_group, location, sku')
        .or('resource_type.ilike.%sql%,resource_type.ilike.%database%');

      const sqlResourceIds = sqlResources?.map(r => r.id) || [];
      const sqlResourceMap = new Map(sqlResources?.map(r => [r.id, r]) || []);

      // === SQL Performance Stats ===
      let deadlocks: DeadlockDetail[] = [];
      let blocked: BlockedDetail[] = [];
      let highDtu: HighDtuDetail[] = [];

      if (sqlResourceIds.length > 0) {
        const { data: perfStats } = await supabase
          .from('azure_sql_performance_stats')
          .select('azure_resource_id, dtu_percent, cpu_percent, storage_percent, deadlock_count, blocked_count, synced_at')
          .in('azure_resource_id', sqlResourceIds)
          .order('timestamp_utc', { ascending: false });

        // Get latest stats per resource
        const latestByResource = new Map<string, typeof perfStats extends (infer T)[] ? T : never>();
        perfStats?.forEach(stat => {
          if (stat.azure_resource_id && !latestByResource.has(stat.azure_resource_id)) {
            latestByResource.set(stat.azure_resource_id, stat);
          }
        });

        // Build detailed lists
        latestByResource.forEach((stat, resourceId) => {
          const resource = sqlResourceMap.get(resourceId);
          if (!resource) return;

          if (stat.deadlock_count && stat.deadlock_count > 0) {
            deadlocks.push({
              resourceId,
              resourceName: resource.name,
              count: stat.deadlock_count,
              lastOccurred: stat.synced_at || new Date().toISOString(),
            });
          }

          if (stat.blocked_count && stat.blocked_count > 0) {
            blocked.push({
              resourceId,
              resourceName: resource.name,
              count: stat.blocked_count,
              waitTimeMs: 0,
            });
          }

          const utilization = stat.dtu_percent || stat.cpu_percent || 0;
          if (utilization > 80) {
            highDtu.push({
              resourceId,
              resourceName: resource.name,
              dtuPercent: stat.dtu_percent || 0,
              cpuPercent: stat.cpu_percent || 0,
              storagePercent: stat.storage_percent || 0,
            });
          }
        });

        // Sort by severity
        deadlocks.sort((a, b) => b.count - a.count);
        blocked.sort((a, b) => b.count - a.count);
        highDtu.sort((a, b) => Math.max(b.dtuPercent, b.cpuPercent) - Math.max(a.dtuPercent, a.cpuPercent));
      }

      // === Missing Indexes ===
      const { data: recommendations } = await supabase
        .from('azure_sql_recommendations')
        .select('id, azure_resource_id, name, category, impact, impacted_field, solution')
        .eq('is_resolved', false)
        .order('impact', { ascending: false });

      const missingIndexes: MissingIndexDetail[] = (recommendations || [])
        .filter(r => r.azure_resource_id)
        .map(r => {
          const resource = sqlResourceMap.get(r.azure_resource_id!);
          return {
            id: r.id,
            resourceId: r.azure_resource_id!,
            resourceName: resource?.name || 'Unknown',
            tableName: r.impacted_field || 'Unknown',
            impact: r.impact || 'Low',
            statement: r.solution || '',
            category: r.category || 'Index',
          };
        });

      // === Performance Issues (High CPU/DTU from metrics) ===
      const { data: highUtilMetrics } = await supabase
        .from('azure_metrics')
        .select('azure_resource_id, metric_name, average, timestamp_utc')
        .or('metric_name.ilike.%cpu%,metric_name.ilike.%dtu%')
        .gt('average', 80)
        .order('timestamp_utc', { ascending: false })
        .limit(100);

      const latestMetricByResource = new Map<string, typeof highUtilMetrics extends (infer T)[] ? T : never>();
      highUtilMetrics?.forEach(m => {
        if (!latestMetricByResource.has(m.azure_resource_id)) {
          latestMetricByResource.set(m.azure_resource_id, m);
        }
      });

      const highCpuResourceIds = Array.from(latestMetricByResource.keys());
      let highCpu: HighCpuDetail[] = [];

      if (highCpuResourceIds.length > 0) {
        const { data: resourceDetails } = await supabase
          .from('azure_resources')
          .select('id, name, resource_type, resource_group, location')
          .in('id', highCpuResourceIds);

        const resourceMap = new Map(resourceDetails?.map(r => [r.id, r]) || []);

        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: previousMetrics } = await supabase
          .from('azure_metrics')
          .select('azure_resource_id, average')
          .in('azure_resource_id', highCpuResourceIds)
          .or('metric_name.ilike.%cpu%,metric_name.ilike.%dtu%')
          .lt('timestamp_utc', oneDayAgo.toISOString())
          .order('timestamp_utc', { ascending: false })
          .limit(100);

        const prevMetricByResource = new Map<string, number>();
        previousMetrics?.forEach(m => {
          if (!prevMetricByResource.has(m.azure_resource_id)) {
            prevMetricByResource.set(m.azure_resource_id, m.average || 0);
          }
        });

        highCpu = Array.from(latestMetricByResource.entries())
          .map(([resourceId, metric]) => {
            const resource = resourceMap.get(resourceId);
            const prevValue = prevMetricByResource.get(resourceId) || metric.average || 0;
            const currentValue = metric.average || 0;
            
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (currentValue > prevValue + 5) trend = 'up';
            else if (currentValue < prevValue - 5) trend = 'down';

            return {
              resourceId,
              resourceName: resource?.name || 'Unknown',
              resourceType: resource?.resource_type || 'Unknown',
              value: currentValue,
              metric: metric.metric_name,
              trend,
              location: resource?.location || '',
            };
          })
          .sort((a, b) => b.value - a.value);
      }

      // === Cost Alerts ===
      const { data: costAlertsData } = await supabase
        .from('azure_cost_alerts')
        .select(`
          id,
          severity,
          current_cost,
          threshold_amount,
          message,
          triggered_at,
          rule_id,
          azure_cost_alert_rules (
            name,
            resource_group,
            azure_resource_id
          )
        `)
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false });

      const costAlerts: CostAlertDetail[] = (costAlertsData || []).map(alert => ({
        id: alert.id,
        ruleName: (alert.azure_cost_alert_rules as any)?.name || 'Unknown Rule',
        resourceName: null,
        resourceGroup: (alert.azure_cost_alert_rules as any)?.resource_group || null,
        threshold: alert.threshold_amount,
        current: alert.current_cost,
        severity: alert.severity,
        triggeredAt: alert.triggered_at || new Date().toISOString(),
      }));

      // === Enhanced Underutilized Resources Detection ===
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const COST_LIMIT = 10000;
      const { data: costData } = await supabase
        .from('azure_cost_data')
        .select('azure_resource_id, cost_amount, currency')
        .gte('usage_date', `${currentMonth}-01`)
        .limit(COST_LIMIT);

      const costByResource = new Map<string, { total: number; currency: string }>();
      costData?.forEach(c => {
        if (c.azure_resource_id) {
          const existing = costByResource.get(c.azure_resource_id) || { total: 0, currency: c.currency };
          existing.total += c.cost_amount;
          costByResource.set(c.azure_resource_id, existing);
        }
      });

      // Filter to resources above minimum cost threshold
      const expensiveResourceIds = Array.from(costByResource.entries())
        .filter(([_, cost]) => cost.total > thresholds.minMonthlyCost)
        .map(([id]) => id);

      let underutilized: UnderutilizedDetail[] = [];
      let underutilizationStats = {
        totalResources: 0,
        totalMonthlyCost: 0,
        totalPotentialSavings: 0,
        byRecommendationType: {} as Record<string, { count: number; savings: number }>,
      };

      if (expensiveResourceIds.length > 0) {
        const lookbackDate = new Date();
        lookbackDate.setDate(lookbackDate.getDate() - thresholds.lookbackDays);

        // Fetch ALL metrics for analysis (not just CPU/DTU)
        const METRICS_LIMIT = 5000;
        const { data: allMetrics } = await supabase
          .from('azure_metrics')
          .select('azure_resource_id, metric_name, average, maximum, unit')
          .in('azure_resource_id', expensiveResourceIds)
          .gte('timestamp_utc', lookbackDate.toISOString())
          .limit(METRICS_LIMIT);

        // Group metrics by resource and metric type
        const metricsByResource = new Map<string, Map<string, { sum: number; max: number; count: number; unit: string }>>();
        
        allMetrics?.forEach(m => {
          if (!m.azure_resource_id) return;
          
          if (!metricsByResource.has(m.azure_resource_id)) {
            metricsByResource.set(m.azure_resource_id, new Map());
          }
          
          const resourceMetrics = metricsByResource.get(m.azure_resource_id)!;
          const category = categorizeMetric(m.metric_name);
          if (!category) return;
          
          const existing = resourceMetrics.get(category) || { sum: 0, max: 0, count: 0, unit: m.unit || '%' };
          existing.sum += m.average || 0;
          existing.max = Math.max(existing.max, m.maximum || m.average || 0);
          existing.count += 1;
          resourceMetrics.set(category, existing);
        });

        // Identify underutilized resources based on multiple metrics
        const underutilizedIds: string[] = [];
        
        metricsByResource.forEach((metrics, resourceId) => {
          let belowThresholdCount = 0;
          let analyzedCount = 0;
          
          // Check CPU
          const cpuMetric = metrics.get('cpu');
          if (cpuMetric && cpuMetric.count > 0) {
            analyzedCount++;
            if ((cpuMetric.sum / cpuMetric.count) < thresholds.cpu) belowThresholdCount++;
          }
          
          // Check DTU
          const dtuMetric = metrics.get('dtu');
          if (dtuMetric && dtuMetric.count > 0) {
            analyzedCount++;
            if ((dtuMetric.sum / dtuMetric.count) < thresholds.dtu) belowThresholdCount++;
          }
          
          // Check Memory
          const memMetric = metrics.get('memory');
          if (memMetric && memMetric.count > 0) {
            analyzedCount++;
            if ((memMetric.sum / memMetric.count) < thresholds.memory) belowThresholdCount++;
          }
          
          // Consider underutilized if majority of metrics are below threshold
          // OR if the primary metric (CPU/DTU) is significantly below threshold
          if (analyzedCount > 0) {
            const cpuOrDtuAvg = cpuMetric ? cpuMetric.sum / cpuMetric.count : 
                               dtuMetric ? dtuMetric.sum / dtuMetric.count : null;
            
            if (belowThresholdCount >= Math.ceil(analyzedCount / 2) || 
                (cpuOrDtuAvg !== null && cpuOrDtuAvg < thresholds.cpu * 0.75)) {
              underutilizedIds.push(resourceId);
            }
          }
        });

        if (underutilizedIds.length > 0) {
          const { data: resourceDetails } = await supabase
            .from('azure_resources')
            .select('id, name, resource_type, resource_group, location, sku')
            .in('id', underutilizedIds);

          underutilized = (resourceDetails || [])
            .map(r => {
              const cost = costByResource.get(r.id);
              const resourceMetrics = metricsByResource.get(r.id);
              
              // Build metrics object
              const buildMetricUsage = (category: string): MetricUsage | null => {
                const m = resourceMetrics?.get(category);
                if (!m || m.count === 0) return null;
                return {
                  metricName: category,
                  avgValue: m.sum / m.count,
                  maxValue: m.max,
                  unit: m.unit,
                };
              };
              
              const metricsObj = {
                cpu: buildMetricUsage('cpu'),
                memory: buildMetricUsage('memory'),
                dtu: buildMetricUsage('dtu'),
                storage: buildMetricUsage('storage'),
                network: buildMetricUsage('network'),
              };
              
              // Calculate threshold analysis
              const cpuUnderutilized = metricsObj.cpu ? metricsObj.cpu.avgValue < thresholds.cpu : false;
              const memoryUnderutilized = metricsObj.memory ? metricsObj.memory.avgValue < thresholds.memory : false;
              const dtuUnderutilized = metricsObj.dtu ? metricsObj.dtu.avgValue < thresholds.dtu : false;
              const storageUnderutilized = metricsObj.storage ? metricsObj.storage.avgValue < thresholds.storage : false;
              
              const metricsAnalyzed = [metricsObj.cpu, metricsObj.memory, metricsObj.dtu, metricsObj.storage]
                .filter(m => m !== null).length;
              const metricsBelowThreshold = [cpuUnderutilized, memoryUnderutilized, dtuUnderutilized, storageUnderutilized]
                .filter(Boolean).length;
              
              // Calculate underutilization score
              const underutilizationScore = calculateUnderutilizationScore(metricsObj, thresholds);
              
              // Generate recommendations
              const recs = generateRecommendations(r, metricsObj, thresholds, cost?.total || 0);
              
              // Calculate potential savings from best recommendation
              const maxSavings = recs.length > 0 
                ? Math.max(...recs.map(rec => rec.estimatedSavings))
                : (cost?.total || 0) * 0.3; // Default 30% if no specific recommendations

              return {
                resourceId: r.id,
                resourceName: r.name,
                resourceType: r.resource_type,
                resourceGroup: r.resource_group,
                location: r.location,
                monthlyCost: cost?.total || 0,
                potentialSavings: maxSavings,
                metrics: metricsObj,
                thresholdAnalysis: {
                  cpuUnderutilized,
                  memoryUnderutilized,
                  dtuUnderutilized,
                  storageUnderutilized,
                  metricsAnalyzed,
                  metricsBelowThreshold,
                },
                recommendations: recs,
                underutilizationScore,
                sku: r.sku ? JSON.stringify(r.sku) : null,
              };
            })
            .filter(r => r.recommendations.length > 0 || r.underutilizationScore > 30)
            .sort((a, b) => b.potentialSavings - a.potentialSavings);

          // Calculate stats
          underutilizationStats.totalResources = underutilized.length;
          underutilizationStats.totalMonthlyCost = underutilized.reduce((sum, r) => sum + r.monthlyCost, 0);
          underutilizationStats.totalPotentialSavings = underutilized.reduce((sum, r) => sum + r.potentialSavings, 0);
          
          // Group by recommendation type
          underutilized.forEach(r => {
            r.recommendations.forEach(rec => {
              if (!underutilizationStats.byRecommendationType[rec.type]) {
                underutilizationStats.byRecommendationType[rec.type] = { count: 0, savings: 0 };
              }
              underutilizationStats.byRecommendationType[rec.type].count++;
              underutilizationStats.byRecommendationType[rec.type].savings += rec.estimatedSavings;
            });
          });
        }
      }

      // Calculate summary
      const sqlIssueCount = deadlocks.length + blocked.length + highDtu.length + missingIndexes.length;
      const performanceIssueCount = highCpu.length;
      const costAlertCount = costAlerts.length;
      const underutilizedCount = underutilized.length;

      let overallSeverity: 'healthy' | 'warning' | 'critical' = 'healthy';
      const criticalCpuCount = highCpu.filter(r => r.value > 90).length;
      const criticalCostCount = costAlerts.filter(a => a.severity === 'critical').length;
      
      if (criticalCpuCount > 0 || criticalCostCount > 0 || deadlocks.length > 0) {
        overallSeverity = 'critical';
      } else if (sqlIssueCount > 0 || performanceIssueCount > 0 || costAlertCount > 0 || underutilizedCount > 0) {
        overallSeverity = 'warning';
      }

      return {
        sql: {
          deadlocks,
          blocked,
          highDtu,
          missingIndexes,
        },
        performance: {
          highCpu,
        },
        costAlerts: {
          active: costAlerts,
        },
        underutilized,
        underutilizationStats,
        thresholds,
        summary: {
          sqlIssueCount,
          performanceIssueCount,
          costAlertCount,
          underutilizedCount,
          overallSeverity,
        },
      };
    },
    refetchInterval: 60000,
  });
}
