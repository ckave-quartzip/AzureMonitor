import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export type MonitoringCheck = Tables<'monitoring_checks'>;
export type MonitoringCheckInsert = TablesInsert<'monitoring_checks'>;
export type MonitoringCheckUpdate = TablesUpdate<'monitoring_checks'>;

export function useMonitoringChecks(resourceId?: string) {
  return useQuery({
    queryKey: ['monitoring_checks', resourceId],
    queryFn: async () => {
      let query = supabase.from('monitoring_checks').select('*');
      
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MonitoringCheck[];
    },
    enabled: !!resourceId,
  });
}

export function useAllMonitoringChecks() {
  return useQuery({
    queryKey: ['monitoring_checks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monitoring_checks')
        .select('*, resources(name, resource_type)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMonitoringCheck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (check: MonitoringCheckInsert) => {
      const { data, error } = await supabase
        .from('monitoring_checks')
        .insert(check)
        .select()
        .single();
      
      if (error) throw error;
      return data as MonitoringCheck;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring_checks'] });
      toast({ title: 'Monitoring check created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create monitoring check', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateMonitoringCheck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MonitoringCheckUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('monitoring_checks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MonitoringCheck;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring_checks'] });
      toast({ title: 'Monitoring check updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update monitoring check', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteMonitoringCheck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monitoring_checks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring_checks'] });
      toast({ title: 'Monitoring check deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete monitoring check', description: error.message, variant: 'destructive' });
    },
  });
}

export function useToggleMonitoringCheck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('monitoring_checks')
        .update({ is_enabled })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MonitoringCheck;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monitoring_checks'] });
      toast({ title: `Monitoring check ${data.is_enabled ? 'enabled' : 'disabled'}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to toggle monitoring check', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRunMonitoringCheck() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);

  const runCheck = async (checkId?: string, resourceId?: string) => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-checks', {
        body: { check_id: checkId, resource_id: resourceId },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['monitoring_checks'] });
      queryClient.invalidateQueries({ queryKey: ['check_results'] });
      queryClient.invalidateQueries({ queryKey: ['resources'] });

      const results = data as { 
        total_checks: number; 
        successful: number; 
        failures: number; 
        warnings: number;
      };

      if (results.failures > 0) {
        toast({
          title: 'Check completed with failures',
          description: `${results.successful} passed, ${results.failures} failed`,
          variant: 'destructive',
        });
      } else if (results.warnings > 0) {
        toast({
          title: 'Check completed with warnings',
          description: `${results.successful} passed, ${results.warnings} warnings`,
        });
      } else {
        toast({
          title: 'Check completed successfully',
          description: `${results.total_checks} check(s) passed`,
        });
      }

      return data;
    } catch (error) {
      toast({
        title: 'Failed to run check',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsRunning(false);
    }
  };

  return { runCheck, isRunning };
}
