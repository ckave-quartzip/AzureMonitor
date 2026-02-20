import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LogAnalyticsWorkspace {
  id: string;
  azure_tenant_id: string;
  workspace_id: string;
  workspace_name: string;
  resource_id: string;
  created_at: string;
  updated_at: string;
}

export function useLogAnalyticsWorkspaces(tenantId?: string) {
  return useQuery({
    queryKey: ['log-analytics-workspaces', tenantId],
    queryFn: async () => {
      let query = supabase
        .from('log_analytics_workspaces')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as LogAnalyticsWorkspace[];
    },
  });
}

export function useCreateLogAnalyticsWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (workspace: Omit<LogAnalyticsWorkspace, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('log_analytics_workspaces')
        .insert(workspace)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-analytics-workspaces'] });
    },
  });
}

export function useUpdateLogAnalyticsWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LogAnalyticsWorkspace> & { id: string }) => {
      const { data, error } = await supabase
        .from('log_analytics_workspaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-analytics-workspaces'] });
    },
  });
}

export function useDeleteLogAnalyticsWorkspace() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('log_analytics_workspaces')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-analytics-workspaces'] });
    },
  });
}
