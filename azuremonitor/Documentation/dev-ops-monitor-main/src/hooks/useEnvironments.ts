import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type Environment = Tables<'environments'>;
export type EnvironmentInsert = TablesInsert<'environments'>;
export type EnvironmentUpdate = TablesUpdate<'environments'>;

export function useEnvironments(clientId: string | undefined) {
  return useQuery({
    queryKey: ['environments', clientId],
    queryFn: async () => {
      if (!clientId) throw new Error('No client ID provided');
      
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('client_id', clientId)
        .order('name');
      
      if (error) throw error;
      return data as Environment[];
    },
    enabled: !!clientId,
  });
}

export function useCreateEnvironment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (environment: EnvironmentInsert) => {
      const { data, error } = await supabase
        .from('environments')
        .insert(environment)
        .select()
        .single();
      
      if (error) throw error;
      return data as Environment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['environments', data.client_id] });
      toast({ title: 'Environment created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create environment', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateEnvironment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EnvironmentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('environments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Environment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['environments', data.client_id] });
      toast({ title: 'Environment updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update environment', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteEnvironment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('environments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { clientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['environments', data.clientId] });
      toast({ title: 'Environment deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete environment', description: error.message, variant: 'destructive' });
    },
  });
}
