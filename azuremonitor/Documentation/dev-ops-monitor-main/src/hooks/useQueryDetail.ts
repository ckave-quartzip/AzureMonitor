import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QueryDetailData {
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
  created_at: string;
  updated_at: string;
  // Joined resource info
  database_name: string;
  resource_type: string;
  azure_portal_resource_id: string;
  azure_tenant_id: string;
}

export function useQueryDetail(queryId: string | undefined) {
  return useQuery({
    queryKey: ['query-detail', queryId],
    queryFn: async () => {
      if (!queryId) throw new Error('Query ID is required');

      const { data, error } = await supabase
        .from('azure_sql_insights')
        .select(`
          *,
          azure_resources!inner(
            name,
            resource_type,
            azure_resource_id,
            azure_tenant_id
          )
        `)
        .eq('id', queryId)
        .single();

      if (error) throw error;

      const resourceData = data.azure_resources as {
        name: string;
        resource_type: string;
        azure_resource_id: string;
        azure_tenant_id: string;
      };

      return {
        ...data,
        database_name: resourceData.name,
        resource_type: resourceData.resource_type,
        azure_portal_resource_id: resourceData.azure_resource_id,
        azure_tenant_id: resourceData.azure_tenant_id,
      } as QueryDetailData;
    },
    enabled: !!queryId,
  });
}
