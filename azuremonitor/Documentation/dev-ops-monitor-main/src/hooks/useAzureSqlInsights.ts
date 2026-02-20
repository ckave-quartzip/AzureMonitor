import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SqlQueryInsight {
  id: string;
  azure_resource_id: string;
  query_hash: string;
  query_text: string | null;
  execution_count: number;
  total_cpu_time_ms: number;
  avg_cpu_time_ms: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  total_logical_reads: number;
  avg_logical_reads: number;
  total_logical_writes: number;
  avg_logical_writes: number;
  last_execution_time: string | null;
  plan_count: number | null;
  synced_at: string;
}

export interface SqlRecommendation {
  id: string;
  name: string;
  category: string;
  impact: string;
  impactedField: string;
  impactedValue: string;
  shortDescription: { problem: string; solution: string };
}

export function useAzureSqlTopQueries(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['azure-sql-top-queries', resourceId],
    queryFn: async () => {
      if (!resourceId) return [];

      const { data, error } = await supabase.functions.invoke('azure-sql-insights', {
        body: {
          action: 'top-queries',
          resourceId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.queries as SqlQueryInsight[];
    },
    enabled: !!resourceId,
  });
}

export function useAzureSqlLongRunningQueries(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['azure-sql-long-running', resourceId],
    queryFn: async () => {
      if (!resourceId) return [];

      const { data, error } = await supabase.functions.invoke('azure-sql-insights', {
        body: {
          action: 'long-running',
          resourceId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.queries as SqlQueryInsight[];
    },
    enabled: !!resourceId,
  });
}

export function useAzureSqlRecommendations(resourceId: string | undefined, tenantId: string | undefined) {
  return useQuery({
    queryKey: ['azure-sql-recommendations', resourceId, tenantId],
    queryFn: async () => {
      if (!resourceId || !tenantId) return [];

      const { data, error } = await supabase.functions.invoke('azure-sql-insights', {
        body: {
          action: 'recommendations',
          resourceId,
          tenantId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.recommendations as SqlRecommendation[];
    },
    enabled: !!resourceId && !!tenantId,
  });
}
