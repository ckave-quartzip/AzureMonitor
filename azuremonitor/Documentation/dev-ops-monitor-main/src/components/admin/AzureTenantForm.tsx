import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, TestTube2, Cloud } from 'lucide-react';
import { AzureTenant } from '@/hooks/useAzureTenants';
import { useTestAzureTenant } from '@/hooks/useTestAzureTenant';
import { AzureTenantTestResults } from './AzureTenantTestResults';

const azureTenantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tenant_id: z.string().min(1, 'Azure Tenant ID is required'),
  client_id: z.string().min(1, 'Client ID (App ID) is required'),
  subscription_id: z.string().min(1, 'Subscription ID is required'),
  client_secret: z.string().min(1, 'Client Secret is required'),
  is_enabled: z.boolean().default(true),
});

type AzureTenantFormData = z.infer<typeof azureTenantSchema>;

interface AzureTenantFormProps {
  tenant?: AzureTenant;
  onSubmit: (data: AzureTenantFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AzureTenantForm({ tenant, onSubmit, onCancel, isLoading }: AzureTenantFormProps) {
  const [connectionVerified, setConnectionVerified] = useState(false);
  
  const {
    testConnection,
    testFetchResources,
    isTestingConnection,
    isTestingResources,
    connectionResult,
    resourcesResult,
    clearResults,
  } = useTestAzureTenant();

  const form = useForm<AzureTenantFormData>({
    resolver: zodResolver(azureTenantSchema),
    defaultValues: {
      name: tenant?.name || '',
      tenant_id: tenant?.tenant_id || '',
      client_id: tenant?.client_id || '',
      subscription_id: tenant?.subscription_id || '',
      client_secret: '',
      is_enabled: tenant?.is_enabled ?? true,
    },
  });

  const handleTestConnection = async () => {
    const values = form.getValues();
    
    if (!values.tenant_id || !values.client_id || !values.client_secret) {
      form.trigger(['tenant_id', 'client_id', 'client_secret']);
      return;
    }

    const result = await testConnection({
      tenant_id: values.tenant_id,
      client_id: values.client_id,
      client_secret: values.client_secret,
      subscription_id: values.subscription_id,
    });

    setConnectionVerified(result.success);
  };

  const handleTestFetchResources = async () => {
    const values = form.getValues();
    
    if (!values.tenant_id || !values.client_id || !values.client_secret || !values.subscription_id) {
      form.trigger(['tenant_id', 'client_id', 'client_secret', 'subscription_id']);
      return;
    }

    await testFetchResources({
      tenant_id: values.tenant_id,
      client_id: values.client_id,
      client_secret: values.client_secret,
      subscription_id: values.subscription_id,
    });
  };

  const handleFormSubmit = (data: AzureTenantFormData) => {
    onSubmit(data);
  };

  // Clear results when form values change
  const handleFieldChange = () => {
    if (connectionResult || resourcesResult) {
      clearResults();
      setConnectionVerified(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Azure Tenant Configuration
              </CardTitle>
              <CardDescription>
                Configure your Azure AD app registration to enable resource discovery and monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Production Azure" 
                        {...field} 
                        onChange={(e) => { field.onChange(e); handleFieldChange(); }}
                      />
                    </FormControl>
                    <FormDescription>
                      A friendly name to identify this Azure tenant.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tenant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Azure Tenant ID (Directory ID)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                          {...field}
                          onChange={(e) => { field.onChange(e); handleFieldChange(); }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subscription_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subscription ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                          {...field}
                          onChange={(e) => { field.onChange(e); handleFieldChange(); }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID (Application ID)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" 
                          {...field}
                          onChange={(e) => { field.onChange(e); handleFieldChange(); }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Client Secret
                        {tenant && <span className="text-muted-foreground ml-2">(leave blank to keep existing)</span>}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder={tenant ? '••••••••' : 'Enter client secret'}
                          {...field}
                          onChange={(e) => { field.onChange(e); handleFieldChange(); }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Tenant</FormLabel>
                      <FormDescription>
                        Enable syncing and monitoring for this Azure tenant.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Test Buttons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5" />
                Test Connection
              </CardTitle>
              <CardDescription>
                Verify your credentials before saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || isTestingResources}
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : connectionResult?.success ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      Test Connection
                    </>
                  ) : connectionResult ? (
                    <>
                      <XCircle className="mr-2 h-4 w-4 text-red-500" />
                      Test Connection
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestFetchResources}
                  disabled={isTestingConnection || isTestingResources}
                >
                  {isTestingResources ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : resourcesResult?.success ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      Test Fetch Resources
                    </>
                  ) : resourcesResult ? (
                    <>
                      <XCircle className="mr-2 h-4 w-4 text-red-500" />
                      Test Fetch Resources
                    </>
                  ) : (
                    'Test Fetch Resources'
                  )}
                </Button>
              </div>

              {/* Test Results */}
              <AzureTenantTestResults
                connectionResult={connectionResult}
                resourcesResult={resourcesResult}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isTestingConnection || isTestingResources}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : tenant ? (
                'Update Tenant'
              ) : (
                'Create Tenant'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
