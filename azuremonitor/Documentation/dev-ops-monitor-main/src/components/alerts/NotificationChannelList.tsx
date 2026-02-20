import { useState } from 'react';
import { format } from 'date-fns';
import { Mail, MessageSquare, Webhook, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useNotificationChannels, useCreateNotificationChannel, useUpdateNotificationChannel, useDeleteNotificationChannel, useToggleNotificationChannel, NotificationChannel } from '@/hooks/useNotificationChannels';
import { NotificationChannelForm } from './NotificationChannelForm';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  slack: MessageSquare,
  webhook: Webhook,
  teams: MessageSquare,
};

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  email: 'Email',
  slack: 'Slack',
  webhook: 'Webhook',
  teams: 'Microsoft Teams',
};

export function NotificationChannelList() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: channels, isLoading } = useNotificationChannels();
  const createChannel = useCreateNotificationChannel();
  const updateChannel = useUpdateNotificationChannel();
  const deleteChannel = useDeleteNotificationChannel();
  const toggleChannel = useToggleNotificationChannel();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  const [testingChannelId, setTestingChannelId] = useState<string | null>(null);

  const handleTestNotification = async (channel: NotificationChannel) => {
    setTestingChannelId(channel.id);
    try {
      const config = channel.configuration as Record<string, unknown>;
      const testAlertData = {
        alert_name: 'Test Alert',
        alert_severity: 'warning',
        resource_name: 'Test Resource',
        message: `This is a test notification from ${channel.name}`,
        triggered_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.functions.invoke('send-notifications', {
        body: {
          action: 'send',
          channelType: channel.channel_type,
          channelConfig: config,
          alertData: testAlertData,
        },
      });

      if (error) throw error;

      toast({
        title: 'Test notification sent',
        description: `Successfully sent test to ${channel.name}`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to send test notification',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setTestingChannelId(null);
    }
  };

  const handleCreate = async (data: any) => {
    await createChannel.mutateAsync(data);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: any) => {
    if (!editingChannel) return;
    await updateChannel.mutateAsync({ id: editingChannel.id, ...data });
    setEditingChannel(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Notification Channel</DialogTitle>
              </DialogHeader>
              <NotificationChannelForm
                onSubmit={handleCreate}
                onCancel={() => setIsCreateOpen(false)}
                isLoading={createChannel.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {(!channels || channels.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notification channels configured</p>
            {isAdmin && (
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Create your first channel
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {channels.map((channel) => {
            const Icon = CHANNEL_ICONS[channel.channel_type] || Webhook;
            const config = channel.configuration as Record<string, unknown>;

            return (
              <Card key={channel.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">{channel.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {CHANNEL_TYPE_LABELS[channel.channel_type] || channel.channel_type}
                        </p>
                      </div>
                    </div>
                    <Badge variant={channel.is_enabled ? 'default' : 'secondary'}>
                      {channel.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {config.email && <p>Email: {config.email as string}</p>}
                      {config.webhook_url && <p>URL: {(config.webhook_url as string).substring(0, 50)}...</p>}
                      <p className="mt-1">Created: {format(new Date(channel.created_at), 'PPp')}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestNotification(channel)}
                          disabled={testingChannelId === channel.id}
                        >
                          {testingChannelId === channel.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Test
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleChannel.mutate({ id: channel.id, is_enabled: !channel.is_enabled })}
                        >
                          {channel.is_enabled ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Dialog open={editingChannel?.id === channel.id} onOpenChange={(open) => !open && setEditingChannel(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingChannel(channel)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Notification Channel</DialogTitle>
                            </DialogHeader>
                            <NotificationChannelForm
                              channel={channel}
                              onSubmit={handleUpdate}
                              onCancel={() => setEditingChannel(null)}
                              isLoading={updateChannel.isPending}
                            />
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Notification Channel</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this notification channel? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteChannel.mutate(channel.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
