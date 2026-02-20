import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReplicationLink {
  id: string;
  azure_resource_id: string;
  link_id: string;
  partner_server: string;
  partner_database: string;
  partner_location: string | null;
  role: string | null;
  replication_mode: string | null;
  replication_state: string | null;
  percent_complete: number | null;
  replication_lag_seconds: number | null;
  last_replicated_time: string | null;
  is_termination_allowed: boolean | null;
  synced_at: string;
  created_at: string;
}

export interface ReplicationLagHistoryPoint {
  id: string;
  replication_link_id: string;
  lag_seconds: number | null;
  replication_state: string | null;
  recorded_at: string;
}

// Get replication links for a specific database
export function useReplicationLinks(resourceId: string) {
  return useQuery({
    queryKey: ['sql-replication-links', resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('azure_sql_replication_links')
        .select('*')
        .eq('azure_resource_id', resourceId)
        .order('synced_at', { ascending: false });

      if (error) throw error;
      return data as ReplicationLink[];
    },
    enabled: !!resourceId,
  });
}

// Get replication lag history for a link
export function useReplicationLagHistory(linkId: string, hours: number = 24) {
  return useQuery({
    queryKey: ['sql-replication-lag-history', linkId, hours],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      const { data, error } = await supabase
        .from('azure_sql_replication_lag_history')
        .select('*')
        .eq('replication_link_id', linkId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });

      if (error) throw error;
      return data as ReplicationLagHistoryPoint[];
    },
    enabled: !!linkId,
  });
}

// Get all replication links across all databases
export function useAllReplicationLinks() {
  return useQuery({
    queryKey: ['all-replication-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('azure_sql_replication_links')
        .select(`
          *,
          azure_resources!inner(id, name, resource_group, azure_tenant_id)
        `)
        .order('synced_at', { ascending: false });

      if (error) throw error;
      return data as (ReplicationLink & { azure_resources: { id: string; name: string; resource_group: string; azure_tenant_id: string } })[];
    },
  });
}

// Get databases with replication enabled
export function useDatabasesWithReplication() {
  return useQuery({
    queryKey: ['databases-with-replication'],
    queryFn: async () => {
      // Get unique resource IDs that have replication links
      const { data, error } = await supabase
        .from('azure_sql_replication_links')
        .select(`
          azure_resource_id,
          azure_resources!inner(id, name, resource_group)
        `);

      if (error) throw error;

      // Get unique databases
      const uniqueDatabases = new Map();
      data?.forEach(link => {
        if (link.azure_resources) {
          uniqueDatabases.set(link.azure_resource_id, link.azure_resources);
        }
      });

      return Array.from(uniqueDatabases.values());
    },
  });
}

// Sync replication data for a resource
export function useSyncReplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resourceId, tenantId }: { resourceId: string; tenantId: string }) => {
      const { data, error } = await supabase.functions.invoke('azure-sql-insights', {
        body: {
          action: 'sync-replication',
          resourceId,
          tenantId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sql-replication-links', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['all-replication-links'] });
    },
  });
}

// Helper function to get replication state badge variant
export function getReplicationStateVariant(state: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!state) return 'secondary';
  
  switch (state.toUpperCase()) {
    case 'CATCH_UP':
    case 'CATCHING_UP':
      return 'default'; // Green - healthy
    case 'SEEDING':
      return 'secondary'; // Blue - in progress
    case 'SUSPENDED':
    case 'PENDING':
      return 'outline'; // Yellow - warning
    default:
      return 'secondary';
  }
}

// Helper function to get replication state description
export function getReplicationStateDescription(state: string | null): string {
  if (!state) return 'Unknown state';
  
  switch (state.toUpperCase()) {
    case 'CATCH_UP':
    case 'CATCHING_UP':
      return 'Database is synchronized and catching up with changes';
    case 'SEEDING':
      return 'Initial data sync in progress';
    case 'SUSPENDED':
      return 'Replication is suspended - manual intervention required';
    case 'PENDING':
      return 'Replication is pending initialization';
    default:
      return `State: ${state}`;
  }
}
