import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AzureSyncLog {
  id: string;
  azure_tenant_id: string;
  sync_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  records_processed: number | null;
  error_message: string | null;
  details: Record<string, unknown>;
}

export function useAzureSyncLogs(tenantId?: string, limit: number = 50, tenantIds?: string[]) {
  return useQuery({
    queryKey: ['azure-sync-logs', tenantId, limit, tenantIds],
    queryFn: async () => {
      let query = supabase
        .from('azure_sync_logs' as any)
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit) as any;

      // Handle tenantIds array (multi-tenant filter)
      if (tenantIds && tenantIds.length > 0) {
        query = query.in('azure_tenant_id', tenantIds);
      } else if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AzureSyncLog[];
    },
  });
}
