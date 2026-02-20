import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SqlDatabaseOverview {
  totalDatabases: number;
  highDtuCount: number;
  totalRecommendations: number;
  deadlockCount: number;
  databases: Array<{
    id: string;
    name: string;
    resource_type: string;
    azure_resource_id: string;
    azure_tenant_id: string;
    latestStats: {
      cpu_percent: number | null;
      dtu_percent: number | null;
      deadlock_count: number;
    } | null;
    recommendationCount: number;
  }>;
}

export interface TopProblematicQuery {
  id: string;
  query_hash: string;
  query_text: string | null;
  avg_cpu_time_ms: number;
  avg_duration_ms: number;
  execution_count: number;
  avg_logical_reads: number;
  database_name: string;
  azure_resource_id: string;
  azure_portal_resource_id: string | null;
}

export interface MissingIndex {
  id: string;
  azure_resource_id: string;
  database_name: string;
  recommendation_id: string;
  name: string;
  impact: string | null;
  impacted_value: string | null;
  solution: string | null;
}

// Get overview of all SQL databases
export function useSqlDatabasesOverview() {
  return useQuery({
    queryKey: ['sql-databases-overview'],
    queryFn: async () => {
      // Get SQL database resources
      const { data: sqlResources, error: resourcesError } = await supabase
        .from('azure_resources')
        .select('id, name, resource_type, azure_resource_id, azure_tenant_id')
        .or('resource_type.ilike.%sql%,resource_type.ilike.%database%');

      if (resourcesError) throw resourcesError;

      const sqlDatabases = sqlResources?.filter(r => 
        r.resource_type.toLowerCase().includes('sql') || 
        r.resource_type.toLowerCase().includes('database')
      ) || [];

      const resourceIds = sqlDatabases.map(r => r.id);

      // Get latest performance stats for each database
      const { data: perfStats, error: perfError } = await supabase
        .from('azure_sql_performance_stats')
        .select('azure_resource_id, cpu_percent, dtu_percent, deadlock_count, timestamp_utc')
        .in('azure_resource_id', resourceIds)
        .order('timestamp_utc', { ascending: false });

      if (perfError) throw perfError;

      // Get recommendations count per database
      const { data: recommendations, error: recError } = await supabase
        .from('azure_sql_recommendations')
        .select('azure_resource_id, id')
        .in('azure_resource_id', resourceIds)
        .eq('is_resolved', false);

      if (recError) throw recError;

      // Build unique latest stats per resource
      const latestStatsMap = new Map<string, typeof perfStats[0]>();
      perfStats?.forEach(stat => {
        if (!latestStatsMap.has(stat.azure_resource_id)) {
          latestStatsMap.set(stat.azure_resource_id, stat);
        }
      });

      // Count recommendations per resource
      const recCountMap = new Map<string, number>();
      recommendations?.forEach(rec => {
        recCountMap.set(rec.azure_resource_id, (recCountMap.get(rec.azure_resource_id) || 0) + 1);
      });

      // Calculate overview stats
      let highDtuCount = 0;
      let totalDeadlocks = 0;

      const databases = sqlDatabases.map(db => {
        const stats = latestStatsMap.get(db.id);
        const recCount = recCountMap.get(db.id) || 0;

        if (stats?.dtu_percent && stats.dtu_percent > 80) {
          highDtuCount++;
        }
        if (stats?.deadlock_count) {
          totalDeadlocks += stats.deadlock_count;
        }

        return {
          ...db,
          latestStats: stats ? {
            cpu_percent: stats.cpu_percent,
            dtu_percent: stats.dtu_percent,
            deadlock_count: stats.deadlock_count,
          } : null,
          recommendationCount: recCount,
        };
      });

      const overview: SqlDatabaseOverview = {
        totalDatabases: sqlDatabases.length,
        highDtuCount,
        totalRecommendations: recommendations?.length || 0,
        deadlockCount: totalDeadlocks,
        databases,
      };

      return overview;
    },
  });
}

// Get top problematic queries across all databases
export function useTopProblematicQueries(limit: number = 20) {
  return useQuery({
    queryKey: ['top-problematic-queries', limit],
    queryFn: async () => {
      // Get SQL insights sorted by CPU
      const { data: insights, error: insightsError } = await supabase
        .from('azure_sql_insights')
        .select('id, azure_resource_id, query_hash, query_text, avg_cpu_time_ms, avg_duration_ms, execution_count, avg_logical_reads')
        .order('avg_cpu_time_ms', { ascending: false })
        .limit(limit);

      if (insightsError) throw insightsError;

      if (!insights || insights.length === 0) return [];

      // Get resource names and azure_resource_id (portal ID)
      const resourceIds = [...new Set(insights.map(i => i.azure_resource_id))];
      const { data: resources, error: resourcesError } = await supabase
        .from('azure_resources')
        .select('id, name, azure_resource_id')
        .in('id', resourceIds);

      if (resourcesError) throw resourcesError;

      const resourceMap = new Map(resources?.map(r => [r.id, { name: r.name, azure_resource_id: r.azure_resource_id }]) || []);

      const queries: TopProblematicQuery[] = insights.map(insight => {
        const resource = resourceMap.get(insight.azure_resource_id);
        return {
          id: insight.id,
          query_hash: insight.query_hash,
          query_text: insight.query_text,
          avg_cpu_time_ms: insight.avg_cpu_time_ms,
          avg_duration_ms: insight.avg_duration_ms,
          execution_count: insight.execution_count,
          avg_logical_reads: insight.avg_logical_reads,
          database_name: resource?.name || 'Unknown',
          azure_resource_id: insight.azure_resource_id,
          azure_portal_resource_id: resource?.azure_resource_id || null,
        };
      });

      return queries;
    },
  });
}

// Get all missing index recommendations across databases
export function useAllMissingIndexes() {
  return useQuery({
    queryKey: ['all-missing-indexes'],
    queryFn: async () => {
      // Get all unresolved recommendations (focusing on index-related)
      const { data: recommendations, error: recError } = await supabase
        .from('azure_sql_recommendations')
        .select('id, azure_resource_id, recommendation_id, name, impact, impacted_value, solution')
        .eq('is_resolved', false)
        .order('impact', { ascending: true });

      if (recError) throw recError;

      if (!recommendations || recommendations.length === 0) return [];

      // Get resource names
      const resourceIds = [...new Set(recommendations.map(r => r.azure_resource_id))];
      const { data: resources, error: resourcesError } = await supabase
        .from('azure_resources')
        .select('id, name')
        .in('id', resourceIds);

      if (resourcesError) throw resourcesError;

      const resourceNameMap = new Map(resources?.map(r => [r.id, r.name]) || []);

      const indexes: MissingIndex[] = recommendations.map(rec => ({
        id: rec.id,
        azure_resource_id: rec.azure_resource_id,
        database_name: resourceNameMap.get(rec.azure_resource_id) || 'Unknown',
        recommendation_id: rec.recommendation_id,
        name: rec.name,
        impact: rec.impact,
        impacted_value: rec.impacted_value,
        solution: rec.solution,
      }));

      return indexes;
    },
  });
}
