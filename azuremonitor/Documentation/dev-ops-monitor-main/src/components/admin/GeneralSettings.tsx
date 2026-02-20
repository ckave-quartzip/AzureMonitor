import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Globe, Loader2, Save, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useDecryptedSetting, useUpsertEncryptedSetting, APP_SETTINGS } from '@/hooks/useSystemSettings';
import { toast } from 'sonner';

const formSchema = z.object({
  appUrl: z.string().url('Please enter a valid URL').or(z.literal('')),
});

type FormData = z.infer<typeof formSchema>;

export function GeneralSettings() {
  const [isSaving, setIsSaving] = useState(false);

  const appUrl = useDecryptedSetting(APP_SETTINGS.APP_URL);
  const upsertSetting = useUpsertEncryptedSetting();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      appUrl: '',
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (appUrl.data) {
      form.setValue('appUrl', appUrl.data);
    }
  }, [appUrl.data, form]);

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      if (data.appUrl) {
        await upsertSetting.mutateAsync({
          settingKey: APP_SETTINGS.APP_URL,
          value: data.appUrl,
          description: 'Application URL for notification links',
        });
      }

      toast.success('Settings saved successfully');
      appUrl.refetch();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = appUrl.isLoading;
  const isConfigured = !!appUrl.data;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure general application settings</CardDescription>
            </div>
          </div>
          {isConfigured && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Configured
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="appUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-app.example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    The public URL of your application. Used in notification links (e.g., Teams alerts).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Settings
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
