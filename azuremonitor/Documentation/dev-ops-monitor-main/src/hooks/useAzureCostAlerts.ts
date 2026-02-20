import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface AzureCostAlert {
  id: string;
  rule_id: string;
  azure_tenant_id: string;
  triggered_at: string;
  current_cost: number;
  threshold_amount: number;
  severity: 'warning' | 'critical' | 'info';
  message: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  // Joined fields
  azure_cost_alert_rule?: {
    name: string;
    threshold_period: string;
  };
  azure_tenant?: {
    name: string;
  };
}

export function useAzureCostAlerts(options?: { includeResolved?: boolean }) {
  const includeResolved = options?.includeResolved ?? false;

  return useQuery({
    queryKey: ['azure-cost-alerts', { includeResolved }],
    queryFn: async () => {
      let query = supabase
        .from('azure_cost_alerts' as any)
        .select(`
          *,
          azure_cost_alert_rule:azure_cost_alert_rules(name, threshold_period),
          azure_tenant:azure_tenants(name)
        `)
        .order('triggered_at', { ascending: false }) as any;

      if (!includeResolved) {
        query = query.is('resolved_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AzureCostAlert[];
    },
  });
}

export function useAcknowledgeAzureCostAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await (supabase
        .from('azure_cost_alerts' as any)
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AzureCostAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-cost-alerts'] });
      toast({
        title: 'Alert acknowledged',
        description: 'The cost alert has been acknowledged.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error acknowledging alert',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useResolveAzureCostAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (supabase
        .from('azure_cost_alerts' as any)
        .update({
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single() as any);

      if (error) throw error;
      return data as AzureCostAlert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['azure-cost-alerts'] });
      toast({
        title: 'Alert resolved',
        description: 'The cost alert has been marked as resolved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error resolving alert',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
