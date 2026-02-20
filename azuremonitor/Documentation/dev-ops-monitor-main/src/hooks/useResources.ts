import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type Resource = Tables<'resources'>;
export type ResourceInsert = TablesInsert<'resources'>;
export type ResourceUpdate = TablesUpdate<'resources'>;

export function useResources(environmentId?: string, clientId?: string) {
  return useQuery({
    queryKey: ['resources', environmentId, clientId],
    queryFn: async () => {
      let query = supabase.from('resources').select('*');
      
      if (environmentId) {
        query = query.eq('environment_id', environmentId);
      } else if (clientId) {
        query = query.eq('client_id', clientId).is('environment_id', null);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!(environmentId || clientId),
  });
}

export function useAllResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('*, clients(name), environments(name)')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: ['resources', 'detail', id],
    queryFn: async () => {
      if (!id) throw new Error('No resource ID provided');
      
      const { data, error } = await supabase
        .from('resources')
        .select('*, clients(name), environments(name)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (resource: ResourceInsert) => {
      const { data, error } = await supabase
        .from('resources')
        .insert(resource)
        .select()
        .single();
      
      if (error) throw error;
      return data as Resource;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({ title: 'Resource created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create resource', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ResourceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Resource;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({ title: 'Resource updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update resource', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({ title: 'Resource deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete resource', description: error.message, variant: 'destructive' });
    },
  });
}
