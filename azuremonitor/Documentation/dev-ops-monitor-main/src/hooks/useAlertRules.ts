import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type AlertRule = Tables<'alert_rules'> & {
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_days?: string[] | null;
  quiet_hours_timezone?: string | null;
  // Azure-specific fields
  azure_resource_id?: string | null;
  azure_tenant_id?: string | null;
  azure_resource_type?: string | null;
  timeframe_minutes?: number | null;
  aggregation_type?: 'average' | 'max' | 'min' | 'sum' | null;
  // Joined relations
  resources?: { name: string; resource_type: string } | null;
  azure_resources?: { name: string; resource_type: string } | null;
  azure_tenants?: { name: string } | null;
};

export type AlertRuleInsert = TablesInsert<'alert_rules'> & {
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_days?: string[] | null;
  quiet_hours_timezone?: string | null;
  // Azure-specific fields
  azure_resource_id?: string | null;
  azure_tenant_id?: string | null;
  azure_resource_type?: string | null;
  timeframe_minutes?: number | null;
  aggregation_type?: string | null;
};

export type AlertRuleUpdate = TablesUpdate<'alert_rules'> & {
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;
  quiet_hours_days?: string[] | null;
  quiet_hours_timezone?: string | null;
  // Azure-specific fields
  azure_resource_id?: string | null;
  azure_tenant_id?: string | null;
  azure_resource_type?: string | null;
  timeframe_minutes?: number | null;
  aggregation_type?: string | null;
};

// Azure metric rule types
export const AZURE_RULE_TYPES = [
  'azure_cpu_usage',
  'azure_memory_usage',
  'azure_dtu_usage',
  'azure_storage_usage',
  'azure_network_in',
  'azure_network_out',
  'azure_http_errors',
  'azure_response_time',
  'azure_requests',
  'azure_disk_read',
  'azure_disk_write',
  'azure_transactions',
  'azure_availability',
] as const;

export type AzureRuleType = typeof AZURE_RULE_TYPES[number];

export function isAzureRuleType(ruleType: string): ruleType is AzureRuleType {
  return AZURE_RULE_TYPES.includes(ruleType as AzureRuleType);
}

export function useAlertRules(resourceId?: string) {
  return useQuery({
    queryKey: ['alert_rules', resourceId],
    queryFn: async () => {
      let query = supabase
        .from('alert_rules')
        .select(`
          *,
          resources(name, resource_type),
          azure_resources:azure_resource_id(name, resource_type),
          azure_tenants:azure_tenant_id(name)
        `)
        .order('is_template', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as AlertRule[];
    },
  });
}

export function useCreateAlertRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rule: AlertRuleInsert) => {
      const { data, error } = await supabase
        .from('alert_rules')
        .insert(rule as any)
        .select()
        .single();
      
      if (error) throw error;
      return data as AlertRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert_rules'] });
      toast({ title: 'Alert rule created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create alert rule', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AlertRuleUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('alert_rules')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as AlertRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert_rules'] });
      toast({ title: 'Alert rule updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update alert rule', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteAlertRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert_rules'] });
      toast({ title: 'Alert rule deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete alert rule', description: error.message, variant: 'destructive' });
    },
  });
}

export function useToggleAlertRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('alert_rules')
        .update({ is_enabled })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as AlertRule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['alert_rules'] });
      toast({ title: `Alert rule ${data.is_enabled ? 'enabled' : 'disabled'}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to toggle alert rule', description: error.message, variant: 'destructive' });
    },
  });
}
