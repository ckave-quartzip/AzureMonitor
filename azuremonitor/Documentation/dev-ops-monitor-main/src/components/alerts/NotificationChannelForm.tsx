import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotificationChannel } from '@/hooks/useNotificationChannels';
import { Constants } from '@/integrations/supabase/types';

const CHANNEL_TYPES = Constants.public.Enums.notification_channel_type;

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  email: 'Email',
  slack: 'Slack',
  webhook: 'Webhook',
  teams: 'Microsoft Teams',
};

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  channel_type: z.enum(CHANNEL_TYPES as unknown as [string, ...string[]]),
  email: z.string().email().optional().or(z.literal('')),
  webhook_url: z.string().url().optional().or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

interface NotificationChannelFormProps {
  channel?: NotificationChannel;
  onSubmit: (data: { name: string; channel_type: string; configuration: Record<string, unknown> }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function NotificationChannelForm({ channel, onSubmit, onCancel, isLoading }: NotificationChannelFormProps) {
  const config = (channel?.configuration || {}) as Record<string, unknown>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: channel?.name || '',
      channel_type: channel?.channel_type || 'email',
      email: (config.email as string) || '',
      webhook_url: (config.webhook_url as string) || '',
    },
  });

  const channelType = form.watch('channel_type');

  const handleSubmit = (data: FormData) => {
    const configuration: Record<string, unknown> = {};

    if (data.channel_type === 'email' && data.email) {
      configuration.email = data.email;
    } else if (['slack', 'webhook', 'teams'].includes(data.channel_type) && data.webhook_url) {
      configuration.webhook_url = data.webhook_url;
    }

    onSubmit({
      name: data.name,
      channel_type: data.channel_type,
      configuration,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="My notification channel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="channel_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Channel Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CHANNEL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {CHANNEL_TYPE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {channelType === 'email' && (
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="alerts@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {['slack', 'webhook', 'teams'].includes(channelType) && (
          <FormField
            control={form.control}
            name="webhook_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhook URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://hooks.example.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {channel ? 'Update Channel' : 'Create Channel'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
