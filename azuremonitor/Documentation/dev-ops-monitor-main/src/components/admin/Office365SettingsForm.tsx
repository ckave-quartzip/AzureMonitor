import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useO365Settings, useUpsertEncryptedSetting, O365_SETTINGS } from '@/hooks/useSystemSettings';
import { Loader2, Eye, EyeOff, Mail, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const formSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  senderEmail: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof formSchema>;

export function Office365SettingsForm() {
  const { tenantId, clientId, clientSecret, senderEmail, isLoading, isConfigured, refetch } = useO365Settings();
  const upsertSetting = useUpsertEncryptedSetting();
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tenantId: '',
      clientId: '',
      clientSecret: '',
      senderEmail: '',
    },
  });

  // Populate form when settings are loaded
  useEffect(() => {
    if (!isLoading) {
      form.reset({
        tenantId: tenantId || '',
        clientId: clientId || '',
        clientSecret: clientSecret || '',
        senderEmail: senderEmail || '',
      });
    }
  }, [isLoading, tenantId, clientId, clientSecret, senderEmail, form]);

  const onSubmit = async (data: FormData) => {
    try {
      // Save all settings in parallel
      await Promise.all([
        upsertSetting.mutateAsync({
          settingKey: O365_SETTINGS.TENANT_ID,
          value: data.tenantId,
          description: 'Microsoft 365 Tenant ID',
        }),
        upsertSetting.mutateAsync({
          settingKey: O365_SETTINGS.CLIENT_ID,
          value: data.clientId,
          description: 'Microsoft Graph Application (Client) ID',
        }),
        upsertSetting.mutateAsync({
          settingKey: O365_SETTINGS.CLIENT_SECRET,
          value: data.clientSecret,
          description: 'Microsoft Graph Client Secret',
        }),
        upsertSetting.mutateAsync({
          settingKey: O365_SETTINGS.SENDER_EMAIL,
          value: data.senderEmail,
          description: 'Sender email address for notifications',
        }),
      ]);

      toast.success('Office 365 settings saved successfully');
      setTestResult(null);
      refetch();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const testConnection = async () => {
    const values = form.getValues();
    
    // Validate form first
    const result = formSchema.safeParse(values);
    if (!result.success) {
      toast.error('Please fill in all fields before testing');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-notifications', {
        body: {
          action: 'test',
          credentials: {
            tenantId: values.tenantId,
            clientId: values.clientId,
            clientSecret: values.clientSecret,
            senderEmail: values.senderEmail,
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult('success');
        toast.success('Connection test successful!');
      } else {
        setTestResult('error');
        toast.error(data?.error || 'Connection test failed');
      }
    } catch (error: unknown) {
      setTestResult('error');
      const message = error instanceof Error ? error.message : 'Connection test failed';
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Office 365 Email Settings</CardTitle>
            <CardDescription>
              Configure Microsoft Graph API for sending email notifications
            </CardDescription>
          </div>
        </div>
        {isConfigured && (
          <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Office 365 is configured</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenantId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant ID</FormLabel>
                  <FormControl>
                    <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your Microsoft 365 Tenant ID (Directory ID)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application (Client) ID</FormLabel>
                  <FormControl>
                    <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                  </FormControl>
                  <FormDescription>
                    The Application ID from your Azure App Registration
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Secret</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showSecret ? 'text' : 'password'}
                        placeholder="Enter client secret"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Client secret from your Azure App Registration (encrypted at rest)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="senderEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sender Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="alerts@yourcompany.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    Email address that will send the notifications (must have proper permissions)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={upsertSetting.isPending}>
                {upsertSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : testResult === 'success' ? (
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                ) : testResult === 'error' ? (
                  <XCircle className="mr-2 h-4 w-4 text-destructive" />
                ) : (
                  <AlertCircle className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
            </div>
          </form>
        </Form>

        <div className="mt-6 rounded-lg border bg-muted/50 p-4">
          <h4 className="text-sm font-medium mb-2">Setup Instructions</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Go to Azure Portal → Azure Active Directory → App Registrations</li>
            <li>Create a new registration or select an existing one</li>
            <li>Copy the Application (client) ID and Directory (tenant) ID</li>
            <li>Under Certificates & secrets, create a new client secret</li>
            <li>Under API permissions, add Mail.Send permission (Application type)</li>
            <li>Grant admin consent for the permissions</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
