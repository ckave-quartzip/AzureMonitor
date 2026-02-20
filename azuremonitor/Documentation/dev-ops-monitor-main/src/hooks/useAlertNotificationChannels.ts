import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAlertNotificationChannels(alertRuleId?: string) {
  return useQuery({
    queryKey: ['alert_notification_channels', alertRuleId],
    queryFn: async () => {
      if (!alertRuleId) return [];
      
      const { data, error } = await supabase
        .from('alert_notification_channels')
        .select('notification_channel_id')
        .eq('alert_rule_id', alertRuleId);
      
      if (error) throw error;
      return data.map(d => d.notification_channel_id);
    },
    enabled: !!alertRuleId,
  });
}

export function useUpdateAlertRuleChannels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ alertRuleId, channelIds }: { alertRuleId: string; channelIds: string[] }) => {
      // Delete existing links
      const { error: deleteError } = await supabase
        .from('alert_notification_channels')
        .delete()
        .eq('alert_rule_id', alertRuleId);
      
      if (deleteError) throw deleteError;

      // Insert new links if any
      if (channelIds.length > 0) {
        const { error: insertError } = await supabase
          .from('alert_notification_channels')
          .insert(channelIds.map(channelId => ({
            alert_rule_id: alertRuleId,
            notification_channel_id: channelId,
          })));
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alert_notification_channels', variables.alertRuleId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update notification channels', description: error.message, variant: 'destructive' });
    },
  });
}
