import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type Alert = Tables<'alerts'>;
export type AlertInsert = TablesInsert<'alerts'>;
export type AlertUpdate = TablesUpdate<'alerts'>;

export function useAlerts(resourceId?: string) {
  return useQuery({
    queryKey: ['alerts', resourceId],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*, resources(name, resource_type), alert_rules(rule_type, threshold_value)')
        .order('triggered_at', { ascending: false });

      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useUnresolvedAlerts() {
  return useQuery({
    queryKey: ['alerts', 'unresolved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, resources(name, resource_type)')
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('alerts')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Alert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast({ title: 'Alert acknowledged' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to acknowledge alert', description: error.message, variant: 'destructive' });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Alert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast({ title: 'Alert resolved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to resolve alert', description: error.message, variant: 'destructive' });
    },
  });
}
