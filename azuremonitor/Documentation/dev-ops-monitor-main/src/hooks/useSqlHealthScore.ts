import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SqlHealthScore {
  overallScore: number;
  performanceScore: number;
  waitStatsScore: number;
  replicationScore: number;
  databaseCount: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  lastUpdated: string | null;
  factors: {
    avgDtuPercent: number | null;
    avgCpuPercent: number | null;
    highDtuCount: number;
    deadlockCount: number;
    blockedCount: number;
    topWaitType: string | null;
    topWaitTimeMs: number;
    replicationIssues: number;
    avgReplicationLag: number;
  };
}

function calculatePerformanceScore(
  avgDtu: number | null,
  avgCpu: number | null,
  deadlocks: number,
  blocked: number
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

  return Math.max(0, score);
}

function calculateWaitStatsScore(topWaitTimeMs: number): number {
  let score = 100;

  // High wait times indicate resource contention
  const waitTimeSeconds = topWaitTimeMs / 1000;
  if (waitTimeSeconds > 10000) score -= 40;
  else if (waitTimeSeconds > 5000) score -= 25;
  else if (waitTimeSeconds > 1000) score -= 15;
  else if (waitTimeSeconds > 100) score -= 5;

  return Math.max(0, score);
}

function calculateReplicationScore(
  issues: number,
  avgLagSeconds: number
): number {
  if (issues === 0) return 100;

  let score = 100;

  // Issues penalty
  if (issues > 5) score -= 30;
  else if (issues > 2) score -= 15;
  else if (issues > 0) score -= 5;

  // Lag penalty
  if (avgLagSeconds > 300) score -= 40;
  else if (avgLagSeconds > 60) score -= 25;
  else if (avgLagSeconds > 30) score -= 15;
  else if (avgLagSeconds > 10) score -= 5;

  return Math.max(0, score);
}

export function useSqlHealthScore() {
  return useQuery({
    queryKey: ['sql-health-score'],
    queryFn: async (): Promise<SqlHealthScore> => {
      // Get SQL database resources
      const { data: sqlResources } = await supabase
        .from('azure_resources')
        .select('id, name')
        .or('resource_type.ilike.%sql%,resource_type.ilike.%database%');

      if (!sqlResources || sqlResources.length === 0) {
        return {
          overallScore: 100,
          performanceScore: 100,
          waitStatsScore: 100,
          replicationScore: 100,
          databaseCount: 0,
          healthyCount: 0,
          warningCount: 0,
          criticalCount: 0,
          lastUpdated: null,
          factors: {
            avgDtuPercent: null,
            avgCpuPercent: null,
            highDtuCount: 0,
            deadlockCount: 0,
            blockedCount: 0,
            topWaitType: null,
            topWaitTimeMs: 0,
            replicationIssues: 0,
            avgReplicationLag: 0,
          },
        };
      }

      const resourceIds = sqlResources.map((r) => r.id);

      // Get performance stats
      const PERF_LIMIT = 2000;
      const { data: perfStats } = await supabase
        .from('azure_sql_performance_stats')
        .select('*')
        .in('azure_resource_id', resourceIds)
        .order('timestamp_utc', { ascending: false })
        .limit(PERF_LIMIT);

      // Get latest stats per resource
      const latestPerfByResource = new Map<string, typeof perfStats extends (infer T)[] ? T : never>();
      perfStats?.forEach((stat) => {
        if (stat.azure_resource_id && !latestPerfByResource.has(stat.azure_resource_id)) {
          latestPerfByResource.set(stat.azure_resource_id, stat);
        }
      });

      const latestPerf = Array.from(latestPerfByResource.values());

      // Calculate performance metrics
      const avgDtu = latestPerf.length > 0
        ? latestPerf.reduce((sum, s) => sum + (s.dtu_percent || 0), 0) / latestPerf.length
        : null;
      const avgCpu = latestPerf.length > 0
        ? latestPerf.reduce((sum, s) => sum + (s.cpu_percent || 0), 0) / latestPerf.length
        : null;
      const highDtuCount = latestPerf.filter(
        (s) => (s.dtu_percent || s.cpu_percent || 0) > 80
      ).length;
      const deadlockCount = latestPerf.reduce((sum, s) => sum + (s.deadlock_count || 0), 0);
      const blockedCount = latestPerf.reduce((sum, s) => sum + (s.blocked_count || 0), 0);

      // Get wait stats
      const { data: waitStats } = await supabase
        .from('azure_sql_wait_stats')
        .select('*')
        .in('azure_resource_id', resourceIds)
        .order('wait_time_ms', { ascending: false })
        .limit(50);

      const topWaitType = waitStats?.[0]?.wait_type || null;
      const topWaitTimeMs = waitStats?.[0]?.wait_time_ms || 0;

      // Get replication status
      const { data: replicationLinks } = await supabase
        .from('azure_sql_replication_links')
        .select('*')
        .in('azure_resource_id', resourceIds);

      const replicationIssues = replicationLinks?.filter(
        (l) => l.replication_state !== 'CATCH_UP' && l.replication_state !== 'SEEDING'
      ).length || 0;
      const avgReplicationLag = replicationLinks?.length
        ? replicationLinks.reduce((sum, l) => sum + (l.replication_lag_seconds || 0), 0) /
          replicationLinks.length
        : 0;

      // Calculate scores
      const performanceScore = calculatePerformanceScore(avgDtu, avgCpu, deadlockCount, blockedCount);
      const waitStatsScore = calculateWaitStatsScore(topWaitTimeMs);
      const replicationScore = calculateReplicationScore(replicationIssues, avgReplicationLag);

      // Weight the scores (performance 50%, wait stats 30%, replication 20%)
      const overallScore = Math.round(
        performanceScore * 0.5 + waitStatsScore * 0.3 + replicationScore * 0.2
      );

      // Categorize databases
      const healthyCount = latestPerf.filter(
        (s) => (s.dtu_percent || s.cpu_percent || 0) < 70
      ).length;
      const warningCount = latestPerf.filter(
        (s) => {
          const util = s.dtu_percent || s.cpu_percent || 0;
          return util >= 70 && util < 85;
        }
      ).length;
      const criticalCount = latestPerf.filter(
        (s) => (s.dtu_percent || s.cpu_percent || 0) >= 85
      ).length;

      // Get last updated timestamp
      const timestamps = [
        ...(latestPerf.map((p) => p.timestamp_utc) || []),
        ...(waitStats?.map((w) => w.collected_at) || []),
        ...(replicationLinks?.map((r) => r.synced_at) || []),
      ].filter(Boolean) as string[];
      const lastUpdated = timestamps.length > 0
        ? timestamps.sort().reverse()[0]
        : null;

      return {
        overallScore,
        performanceScore,
        waitStatsScore,
        replicationScore,
        databaseCount: sqlResources.length,
        healthyCount,
        warningCount,
        criticalCount,
        lastUpdated,
        factors: {
          avgDtuPercent: avgDtu,
          avgCpuPercent: avgCpu,
          highDtuCount,
          deadlockCount,
          blockedCount,
          topWaitType,
          topWaitTimeMs,
          replicationIssues,
          avgReplicationLag,
        },
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
