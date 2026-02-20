import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SqlPerformanceStats {
  id: string;
  azure_resource_id: string;
  timestamp_utc: string;
  cpu_percent: number | null;
  dtu_percent: number | null;
  storage_percent: number | null;
  deadlock_count: number;
  blocked_count: number;
  connection_count: number | null;
  synced_at: string;
}

export interface SqlRecommendation {
  id: string;
  azure_resource_id: string;
  recommendation_id: string;
  name: string;
  category: string | null;
  impact: string | null;
  impacted_field: string | null;
  impacted_value: string | null;
  problem: string | null;
  solution: string | null;
  is_resolved: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

// Get latest performance stats for a resource
export function useSqlPerformanceStats(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['sql-performance-stats', resourceId],
    queryFn: async () => {
      if (!resourceId) return null;

      const { data, error } = await supabase
        .from('azure_sql_performance_stats')
        .select('*')
        .eq('azure_resource_id', resourceId)
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SqlPerformanceStats | null;
    },
    enabled: !!resourceId,
  });
}

// Get performance trend for a resource
export function useSqlPerformanceTrend(resourceId: string | undefined, hours: number = 24) {
  return useQuery({
    queryKey: ['sql-performance-trend', resourceId, hours],
    queryFn: async () => {
      if (!resourceId) return [];

      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);

      const PERF_LIMIT = 5000;
      const { data, error } = await supabase
        .from('azure_sql_performance_stats')
        .select('*')
        .eq('azure_resource_id', resourceId)
        .gte('timestamp_utc', startTime.toISOString())
        .order('timestamp_utc', { ascending: true })
        .limit(PERF_LIMIT);

      if (error) throw error;
      return (data || []) as SqlPerformanceStats[];
    },
    enabled: !!resourceId,
  });
}

// Get recommendations for a resource
export function useSqlRecommendations(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['sql-recommendations', resourceId],
    queryFn: async () => {
      if (!resourceId) return [];

      const { data, error } = await supabase
        .from('azure_sql_recommendations')
        .select('*')
        .eq('azure_resource_id', resourceId)
        .eq('is_resolved', false)
        .order('impact', { ascending: true }); // High impact first (alphabetically reversed)

      if (error) throw error;
      return (data || []) as SqlRecommendation[];
    },
    enabled: !!resourceId,
  });
}
