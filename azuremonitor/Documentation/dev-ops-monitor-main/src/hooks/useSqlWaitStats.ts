import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SqlWaitStat {
  id: string;
  azure_resource_id: string;
  wait_type: string;
  wait_time_ms: number;
  wait_count: number;
  avg_wait_time_ms: number;
  max_wait_time_ms: number;
  collected_at: string;
  synced_at: string;
}

export function useSqlWaitStats(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['sql-wait-stats', resourceId],
    queryFn: async () => {
      if (!resourceId) return [];

      const { data, error } = await supabase
        .from('azure_sql_wait_stats')
        .select('*')
        .eq('azure_resource_id', resourceId)
        .order('wait_time_ms', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SqlWaitStat[];
    },
    enabled: !!resourceId,
  });
}

export function useSyncWaitStats(tenantId: string | undefined) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('tenantId is required');

      const { data, error } = await supabase.functions.invoke('azure-sql-insights', {
        body: {
          action: 'sync-wait-stats',
          tenantId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      // Invalidate wait stats queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['sql-wait-stats'] });
      queryClient.invalidateQueries({ queryKey: ['all-wait-stats'] });
    },
  });
}

// Aggregate wait stats for overview
export function useAllWaitStats() {
  return useQuery({
    queryKey: ['all-wait-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('azure_sql_wait_stats')
        .select('*, azure_resources(name)')
        .order('wait_time_ms', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}
