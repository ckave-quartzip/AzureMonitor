import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IdleResource {
  id: string;
  azure_resource_id: string;
  azure_tenant_id: string;
  detection_date: string;
  idle_days: number;
  monthly_cost: number;
  idle_reason: string;
  metrics_summary: {
    avgCpu?: number;
    maxCpu?: number;
    avgNetwork?: number;
    totalRequests?: number;
  } | null;
  status: 'detected' | 'ignored' | 'actioned' | 'resolved';
  ignored_reason: string | null;
  ignored_by: string | null;
  ignored_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  resource?: {
    id: string;
    name: string;
    resource_type: string;
    resource_group: string;
    location: string;
  };
}

export function useIdleResources(tenantId?: string, status: string = 'detected') {
  return useQuery({
    queryKey: ['idle-resources', tenantId, status],
    queryFn: async (): Promise<IdleResource[]> => {
      let query = supabase
        .from('azure_idle_resources')
        .select(`
          *,
          azure_resources!azure_idle_resources_azure_resource_id_fkey (
            id,
            name,
            resource_type,
            resource_group,
            location
          )
        `)
        .eq('status', status)
        .order('monthly_cost', { ascending: false });

      if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        resource: item.azure_resources,
      })) as IdleResource[];
    },
  });
}

export function useIdleResourcesSummary(tenantIds?: string[]) {
  return useQuery({
    queryKey: ['idle-resources-summary', tenantIds],
    queryFn: async () => {
      let query = supabase
        .from('azure_idle_resources')
        .select('status, monthly_cost, idle_days, azure_tenant_id')
        .eq('status', 'detected');

      if (tenantIds && tenantIds.length > 0) {
        query = query.in('azure_tenant_id', tenantIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      const resources = data || [];
      const totalCost = resources.reduce((sum, r) => sum + r.monthly_cost, 0);
      const avgIdleDays = resources.length > 0
        ? resources.reduce((sum, r) => sum + r.idle_days, 0) / resources.length
        : 0;

      return {
        count: resources.length,
        totalMonthlyCost: totalCost,
        potentialAnnualSavings: totalCost * 12,
        avgIdleDays: Math.round(avgIdleDays),
      };
    },
  });
}

export function useUpdateIdleResourceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      ignoredReason,
    }: {
      id: string;
      status: 'ignored' | 'actioned' | 'resolved';
      ignoredReason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: Record<string, any> = { status };
      
      if (status === 'ignored' && ignoredReason) {
        updateData.ignored_reason = ignoredReason;
        updateData.ignored_by = user?.id;
        updateData.ignored_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('azure_idle_resources')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idle-resources'] });
      queryClient.invalidateQueries({ queryKey: ['idle-resources-summary'] });
    },
  });
}

export function useRunIdleDetection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId?: string | undefined) => {
      const { data, error } = await supabase.functions.invoke('azure-resource-analysis', {
        body: { action: 'detect-idle', tenantId: tenantId || null },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idle-resources'] });
      queryClient.invalidateQueries({ queryKey: ['idle-resources-summary'] });
    },
  });
}
