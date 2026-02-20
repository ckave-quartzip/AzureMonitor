import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChunkDetail {
  chunk_index: number;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  records: number;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface SyncProgress {
  id: string;
  tenant_id: string;
  sync_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  total_chunks: number;
  completed_chunks: number;
  records_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  // Granular progress fields
  current_operation: string | null;
  current_resource_name: string | null;
  failed_chunks: number;
  processing_rate: number | null;
  estimated_completion_at: string | null;
  chunk_details: ChunkDetail[];
}

export function useAzureSyncProgress(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['azure-sync-progress', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('azure_sync_progress')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Parse chunk_details from JSON if it's a string
      return (data || []).map(item => ({
        ...item,
        failed_chunks: item.failed_chunks || 0,
        chunk_details: typeof item.chunk_details === 'string' 
          ? JSON.parse(item.chunk_details) 
          : (item.chunk_details || []),
      })) as SyncProgress[];
    },
    enabled: !!tenantId,
    refetchInterval: (query) => {
      // Poll more frequently if there's a running sync
      const data = query.state.data as SyncProgress[] | undefined;
      const hasRunning = data?.some(p => p.status === 'running' || p.status === 'pending');
      return hasRunning ? 2000 : false;
    },
  });
}

export function useActiveSyncProgress(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['azure-sync-progress-active', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('azure_sync_progress')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['running', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        failed_chunks: data.failed_chunks || 0,
        chunk_details: typeof data.chunk_details === 'string' 
          ? JSON.parse(data.chunk_details) 
          : (data.chunk_details || []),
      } as SyncProgress;
    },
    enabled: !!tenantId,
    refetchInterval: 2000,
  });
}

export function useStartHistoricalCostSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, startDate, endDate }: { 
      tenantId: string; 
      startDate: string; 
      endDate: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('azure-costs', {
        body: {
          action: 'historical-sync',
          tenantId,
          startDate,
          endDate,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['azure-sync-progress', variables.tenantId] });
    },
  });
}

export function useStartHistoricalMetricsSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, days }: { tenantId: string; days: number }) => {
      const { data, error } = await supabase.functions.invoke('azure-metrics', {
        body: {
          action: 'historical-sync',
          tenantId,
          days,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['azure-sync-progress', variables.tenantId] });
    },
  });
}

export function useStartHistoricalSqlInsightsSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, days }: { tenantId: string; days: number }) => {
      const { data, error } = await supabase.functions.invoke('azure-sql-insights', {
        body: {
          action: 'historical-sync',
          tenantId,
          days,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['azure-sync-progress', variables.tenantId] });
    },
  });
}
