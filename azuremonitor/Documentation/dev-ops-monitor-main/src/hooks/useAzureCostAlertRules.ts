import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AzureCostAlertRule {
  id: string;
  name: string;
  azure_tenant_id: string;
  resource_group: string | null;
  azure_resource_id: string | null;
  threshold_amount: number;
  threshold_period: 'daily' | 'weekly' | 'monthly';
  comparison_operator: 'gt' | 'gte' | 'lt' | 'lte';
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  // Quiet hours fields
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_days?: string[] | null;
  quiet_hours_timezone?: string | null;
  // Joined fields
  azure_tenant?: {
    name: string;
  };
  azure_resource?: {
    name: string;
    resource_type: string;
  };
}

export interface AzureCostAlertRuleInsert {
  name: string;
  azure_tenant_id: string;
  resource_group?: string | null;
  azure_resource_id?: string | null;
  threshold_amount: number;
  threshold_period?: 'daily' | 'weekly' | 'monthly';
  comparison_operator?: 'gt' | 'gte' | 'lt' | 'lte';
  is_enabled?: boolean;
  // Quiet hours fields
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_days?: string[] | null;
  quiet_hours_timezone?: string | null;
}

export interface AzureCostAlertRuleUpdate {
  name?: string;
  azure_tenant_id?: string;
  resource_group?: string | null;
  azure_resource_id?: string | null;
  threshold_amount?: number;
  threshold_period?: 'daily' | 'weekly' | 'monthly';
  comparison_operator?: 'gt' | 'gte' | 'lt' | 'lte';
  is_enabled?: boolean;
  // Quiet hours fields
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_days?: string[] | null;
  quiet_hours_timezone?: string | null;
}

export function useAzureCostAlertRules() {
  return useQuery({
    queryKey: ['azure-cost-alert-rules'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('azure_cost_alert_rules' as any)
        .select(`
          *,
          azure_tenant:azure_tenants(name),
          azure_resource:azure_resources(name, resource_type)
        `)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      return data as AzureCostAlertRule[];
    },
  });
}

export function useAzureCostAlertRule(id: string | undefined) {
  return useQuery({
    queryKey: ['azure-cost-alert-rules', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await (supabase
        .from('azure_cost_alert_rules' as any)
        .select(`
          *,
          azure_tenant:azure_tenants(name),
          azure_resource:azure_resources(name, resource_type)
        `)
        .eq('id', id)
        .single() as any);

      if (error) throw error;
      return data as AzureCostAlertRule;
    },
    enabled: !!id,
  });
}

export function useCreateAzureCostAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: AzureCostAlertRuleInsert) => {
      const { data, error } = await (supabase
        .from('azure_cost_alert_rules' as any)
        .insert(rule)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AzureCostAlertRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-cost-alert-rules'] });
      toast({
        title: 'Cost alert rule created',
        description: 'The cost alert rule has been created successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating cost alert rule',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAzureCostAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AzureCostAlertRuleUpdate }) => {
      const { data, error } = await (supabase
        .from('azure_cost_alert_rules' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AzureCostAlertRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-cost-alert-rules'] });
      toast({
        title: 'Cost alert rule updated',
        description: 'The cost alert rule has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating cost alert rule',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAzureCostAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('azure_cost_alert_rules' as any)
        .delete()
        .eq('id', id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-cost-alert-rules'] });
      toast({
        title: 'Cost alert rule deleted',
        description: 'The cost alert rule has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting cost alert rule',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
