import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

export type NotificationChannel = Tables<'notification_channels'>;
export type NotificationChannelInsert = TablesInsert<'notification_channels'>;
export type NotificationChannelUpdate = TablesUpdate<'notification_channels'>;

export function useNotificationChannels() {
  return useQuery({
    queryKey: ['notification_channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_channels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as NotificationChannel[];
    },
  });
}

export function useCreateNotificationChannel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (channel: NotificationChannelInsert) => {
      const { data, error } = await supabase
        .from('notification_channels')
        .insert(channel)
        .select()
        .single();
      
      if (error) throw error;
      return data as NotificationChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_channels'] });
      toast({ title: 'Notification channel created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create notification channel', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateNotificationChannel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: NotificationChannelUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('notification_channels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as NotificationChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_channels'] });
      toast({ title: 'Notification channel updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update notification channel', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteNotificationChannel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notification_channels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_channels'] });
      toast({ title: 'Notification channel deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete notification channel', description: error.message, variant: 'destructive' });
    },
  });
}

export function useToggleNotificationChannel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from('notification_channels')
        .update({ is_enabled })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as NotificationChannel;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notification_channels'] });
      toast({ title: `Notification channel ${data.is_enabled ? 'enabled' : 'disabled'}` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to toggle notification channel', description: error.message, variant: 'destructive' });
    },
  });
}
