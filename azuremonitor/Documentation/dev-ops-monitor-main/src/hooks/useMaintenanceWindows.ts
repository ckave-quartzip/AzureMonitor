import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaintenanceWindow {
  id: string;
  resource_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  is_recurring: boolean;
  recurrence_pattern: 'daily' | 'weekly' | 'monthly' | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceWindowInsert {
  resource_id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | null;
}

export interface MaintenanceWindowUpdate {
  title?: string;
  description?: string | null;
  starts_at?: string;
  ends_at?: string;
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | null;
}

export function useMaintenanceWindows(resourceId?: string) {
  return useQuery({
    queryKey: ['maintenance_windows', resourceId],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_windows')
        .select('*')
        .order('starts_at', { ascending: false });
      
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as MaintenanceWindow[];
    },
  });
}

export function useActiveMaintenanceWindows(resourceId?: string) {
  return useQuery({
    queryKey: ['maintenance_windows', 'active', resourceId],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      let query = supabase
        .from('maintenance_windows')
        .select('*, resources(id, name)')
        .lte('starts_at', now)
        .gte('ends_at', now);
      
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useUpcomingMaintenanceWindows(resourceId?: string, limit = 5) {
  return useQuery({
    queryKey: ['maintenance_windows', 'upcoming', resourceId, limit],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      let query = supabase
        .from('maintenance_windows')
        .select('*, resources(id, name)')
        .gte('starts_at', now)
        .order('starts_at', { ascending: true })
        .limit(limit);
      
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMaintenanceWindow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (window: MaintenanceWindowInsert) => {
      const { data, error } = await supabase
        .from('maintenance_windows')
        .insert(window)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_windows'] });
      toast.success('Maintenance window created');
    },
    onError: (error) => {
      toast.error(`Failed to create maintenance window: ${error.message}`);
    },
  });
}

export function useUpdateMaintenanceWindow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: MaintenanceWindowUpdate }) => {
      const { data, error } = await supabase
        .from('maintenance_windows')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_windows'] });
      toast.success('Maintenance window updated');
    },
    onError: (error) => {
      toast.error(`Failed to update maintenance window: ${error.message}`);
    },
  });
}

export function useDeleteMaintenanceWindow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_windows')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_windows'] });
      toast.success('Maintenance window deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete maintenance window: ${error.message}`);
    },
  });
}
