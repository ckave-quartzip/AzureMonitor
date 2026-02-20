import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type Incident = Tables<'incidents'>;
export type IncidentInsert = TablesInsert<'incidents'>;
export type IncidentUpdate = TablesUpdate<'incidents'>;

type IncidentStatus = 'open' | 'investigating' | 'resolved';

export function useIncidents(status?: IncidentStatus) {
  return useQuery({
    queryKey: ['incidents', status],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('*')
        .order('started_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Incident[];
    },
  });
}

export function useIncident(id: string | undefined) {
  return useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Incident;
    },
    enabled: !!id,
  });
}

export function useIncidentAlerts(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['incident_alerts', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];
      
      const { data, error } = await supabase
        .from('incident_alerts')
        .select('*, alerts(*, resources(name, resource_type))')
        .eq('incident_id', incidentId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!incidentId,
  });
}

export function useCreateIncident() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (incident: IncidentInsert) => {
      const { data, error } = await supabase
        .from('incidents')
        .insert(incident)
        .select()
        .single();
      
      if (error) throw error;
      return data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({ title: 'Incident created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create incident', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateIncident() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IncidentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({ title: 'Incident updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update incident', description: error.message, variant: 'destructive' });
    },
  });
}

export function useResolveIncident() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, resolution_notes, root_cause }: { id: string; resolution_notes?: string; root_cause?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('incidents')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.user?.id,
          resolution_notes,
          root_cause,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Incident;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({ title: 'Incident resolved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to resolve incident', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteIncident() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast({ title: 'Incident deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete incident', description: error.message, variant: 'destructive' });
    },
  });
}

export function useLinkAlertToIncident() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ incident_id, alert_id }: { incident_id: string; alert_id: string }) => {
      const { data, error } = await supabase
        .from('incident_alerts')
        .insert({ incident_id, alert_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident_alerts'] });
      toast({ title: 'Alert linked to incident' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to link alert', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUnlinkAlertFromIncident() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('incident_alerts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident_alerts'] });
      toast({ title: 'Alert unlinked from incident' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to unlink alert', description: error.message, variant: 'destructive' });
    },
  });
}
