import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAzureTenants } from '@/hooks/useAzureTenants';
import { useAzureResources } from '@/hooks/useAzureResources';
import {
  useCreateAzureCostAlertRule,
  useUpdateAzureCostAlertRule,
  AzureCostAlertRule,
  AzureCostAlertRuleInsert,
} from '@/hooks/useAzureCostAlertRules';
import { QuietHoursConfig } from './QuietHoursConfig';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  azure_tenant_id: z.string().min(1, 'Tenant is required'),
  scope_type: z.enum(['tenant', 'resource_group', 'resource']),
  resource_group: z.string().optional().nullable(),
  azure_resource_id: z.string().optional().nullable(),
  threshold_amount: z.number().min(0, 'Threshold must be positive'),
  threshold_period: z.enum(['daily', 'weekly', 'monthly']),
  comparison_operator: z.enum(['gt', 'gte', 'lt', 'lte']),
  is_enabled: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface AzureCostAlertRuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AzureCostAlertRule;
}

export function AzureCostAlertRuleForm({
  open,
  onOpenChange,
  rule,
}: AzureCostAlertRuleFormProps) {
  const { data: tenants } = useAzureTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(
    rule?.azure_tenant_id
  );
  const { data: resources } = useAzureResources(selectedTenantId);

  const createRule = useCreateAzureCostAlertRule();
  const updateRule = useUpdateAzureCostAlertRule();

  const isEditing = !!rule;

  // Quiet hours state
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(rule?.quiet_hours_enabled ?? false);
  const [quietHoursStart, setQuietHoursStart] = useState(rule?.quiet_hours_start ?? '22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState(rule?.quiet_hours_end ?? '08:00');
  const [quietHoursDays, setQuietHoursDays] = useState<string[]>(rule?.quiet_hours_days ?? []);
  const [quietHoursTimezone, setQuietHoursTimezone] = useState(rule?.quiet_hours_timezone ?? 'UTC');

  const getScopeType = (rule?: AzureCostAlertRule): 'tenant' | 'resource_group' | 'resource' => {
    if (rule?.azure_resource_id) return 'resource';
    if (rule?.resource_group) return 'resource_group';
    return 'tenant';
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: rule?.name || '',
      azure_tenant_id: rule?.azure_tenant_id || '',
      scope_type: getScopeType(rule),
      resource_group: rule?.resource_group || null,
      azure_resource_id: rule?.azure_resource_id || null,
      threshold_amount: rule?.threshold_amount || 100,
      threshold_period: rule?.threshold_period || 'monthly',
      comparison_operator: rule?.comparison_operator || 'gt',
      is_enabled: rule?.is_enabled ?? true,
    },
  });

  const scopeType = form.watch('scope_type');
  const tenantId = form.watch('azure_tenant_id');

  useEffect(() => {
    if (tenantId !== selectedTenantId) {
      setSelectedTenantId(tenantId);
    }
  }, [tenantId, selectedTenantId]);

  // Reset quiet hours state when rule changes
  useEffect(() => {
    if (rule) {
      setQuietHoursEnabled(rule.quiet_hours_enabled ?? false);
      setQuietHoursStart(rule.quiet_hours_start ?? '22:00');
      setQuietHoursEnd(rule.quiet_hours_end ?? '08:00');
      setQuietHoursDays(rule.quiet_hours_days ?? []);
      setQuietHoursTimezone(rule.quiet_hours_timezone ?? 'UTC');
    }
  }, [rule]);

  // Get unique resource groups from resources
  const resourceGroups = resources
    ? [...new Set(resources.map((r) => r.resource_group))].sort()
    : [];

  const onSubmit = async (values: FormValues) => {
    const ruleData: AzureCostAlertRuleInsert = {
      name: values.name,
      azure_tenant_id: values.azure_tenant_id,
      resource_group: values.scope_type === 'resource_group' ? values.resource_group : null,
      azure_resource_id: values.scope_type === 'resource' ? values.azure_resource_id : null,
      threshold_amount: values.threshold_amount,
      threshold_period: values.threshold_period,
      comparison_operator: values.comparison_operator,
      is_enabled: values.is_enabled,
      // Quiet hours settings
      quiet_hours_enabled: quietHoursEnabled,
      quiet_hours_start: quietHoursEnabled ? quietHoursStart : null,
      quiet_hours_end: quietHoursEnabled ? quietHoursEnd : null,
      quiet_hours_days: quietHoursEnabled && quietHoursDays.length > 0 ? quietHoursDays : null,
      quiet_hours_timezone: quietHoursEnabled ? quietHoursTimezone : null,
    };

    if (isEditing && rule) {
      await updateRule.mutateAsync({ id: rule.id, updates: ruleData });
    } else {
      await createRule.mutateAsync(ruleData);
    }

    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Cost Alert Rule' : 'Create Cost Alert Rule'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Monthly budget alert" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="azure_tenant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Azure Tenant</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scope_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Scope</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tenant">Entire Tenant</SelectItem>
                      <SelectItem value="resource_group">Resource Group</SelectItem>
                      <SelectItem value="resource">Specific Resource</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {scopeType === 'resource_group' && (
              <FormField
                control={form.control}
                name="resource_group"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource Group</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resourceGroups.map((rg) => (
                          <SelectItem key={rg} value={rg}>
                            {rg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {scopeType === 'resource' && (
              <FormField
                control={form.control}
                name="azure_resource_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {resources?.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id}>
                            {resource.name} ({resource.resource_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="comparison_operator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gt">Greater than</SelectItem>
                        <SelectItem value="gte">Greater or equal</SelectItem>
                        <SelectItem value="lt">Less than</SelectItem>
                        <SelectItem value="lte">Less or equal</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="threshold_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Threshold ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="threshold_period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Enabled</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Receive alerts when threshold is exceeded
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Quiet Hours Configuration */}
            <QuietHoursConfig
              enabled={quietHoursEnabled}
              startTime={quietHoursStart}
              endTime={quietHoursEnd}
              days={quietHoursDays}
              timezone={quietHoursTimezone}
              onEnabledChange={setQuietHoursEnabled}
              onStartTimeChange={setQuietHoursStart}
              onEndTimeChange={setQuietHoursEnd}
              onDaysChange={setQuietHoursDays}
              onTimezoneChange={setQuietHoursTimezone}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createRule.isPending || updateRule.isPending}
              >
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
