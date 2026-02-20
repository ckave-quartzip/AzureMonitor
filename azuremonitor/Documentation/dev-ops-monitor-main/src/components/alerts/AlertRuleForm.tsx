import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertRule, AZURE_RULE_TYPES, isAzureRuleType } from '@/hooks/useAlertRules';
import { useAllResources } from '@/hooks/useResources';
import { useNotificationChannels } from '@/hooks/useNotificationChannels';
import { useAlertNotificationChannels, useUpdateAlertRuleChannels } from '@/hooks/useAlertNotificationChannels';
import { useAzureTenants } from '@/hooks/useAzureTenants';
import { useAzureResources } from '@/hooks/useAzureResources';
import { Constants } from '@/integrations/supabase/types';
import { Mail, MessageSquare, Bell, Cloud, Server } from 'lucide-react';
import { QuietHoursConfig } from './QuietHoursConfig';

const BASE_RULE_TYPES = Constants.public.Enums.alert_rule_type;

// Standard rule types (non-Azure)
const STANDARD_RULE_TYPES = ['response_time', 'ssl_expiry', 'downtime', 'consecutive_failures'] as const;

const RULE_TYPE_LABELS: Record<string, string> = {
  response_time: 'Response Time (ms)',
  ssl_expiry: 'SSL Certificate Expiry (days)',
  downtime: 'Downtime (%)',
  consecutive_failures: 'Consecutive Failures',
  // Azure rule types
  azure_cpu_usage: 'CPU Usage (%)',
  azure_memory_usage: 'Memory Usage',
  azure_dtu_usage: 'DTU Usage (%)',
  azure_storage_usage: 'Storage Usage',
  azure_network_in: 'Network In (bytes)',
  azure_network_out: 'Network Out (bytes)',
  azure_http_errors: 'HTTP 5xx Errors',
  azure_response_time: 'Response Time (ms)',
  azure_requests: 'Request Count',
  azure_disk_read: 'Disk Read (bytes)',
  azure_disk_write: 'Disk Write (bytes)',
  azure_transactions: 'Transactions',
  azure_availability: 'Availability (%)',
};

const RULE_TYPE_DESCRIPTIONS: Record<string, string> = {
  response_time: 'Alert when response time exceeds threshold',
  ssl_expiry: 'Alert when SSL certificate expires within threshold days',
  downtime: 'Alert when downtime percentage exceeds threshold',
  consecutive_failures: 'Alert after X consecutive check failures',
  // Azure descriptions
  azure_cpu_usage: 'Alert when Azure resource CPU usage exceeds threshold',
  azure_memory_usage: 'Alert when Azure resource memory usage exceeds threshold',
  azure_dtu_usage: 'Alert when SQL Database DTU usage exceeds threshold',
  azure_storage_usage: 'Alert when storage usage exceeds threshold',
  azure_network_in: 'Alert when incoming network traffic exceeds threshold',
  azure_network_out: 'Alert when outgoing network traffic exceeds threshold',
  azure_http_errors: 'Alert when HTTP 5xx error count exceeds threshold',
  azure_response_time: 'Alert when Azure resource response time exceeds threshold',
  azure_requests: 'Alert when request count exceeds threshold',
  azure_disk_read: 'Alert when disk read bytes exceeds threshold',
  azure_disk_write: 'Alert when disk write bytes exceeds threshold',
  azure_transactions: 'Alert when transaction count exceeds threshold',
  azure_availability: 'Alert when availability percentage drops below threshold',
};

const COMPARISON_OPERATORS = [
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'eq', label: 'Equal to' },
  { value: 'neq', label: 'Not equal to' },
];

const RESOURCE_TYPES = [
  { value: 'website', label: 'Website' },
  { value: 'api', label: 'API' },
  { value: 'server', label: 'Server' },
  { value: 'database', label: 'Database' },
  { value: 'service', label: 'Service' },
];

// Azure resource types for template rules
const AZURE_RESOURCE_TYPE_OPTIONS = [
  { value: 'microsoft.compute/virtualmachines', label: 'Virtual Machines' },
  { value: 'microsoft.sql/servers/databases', label: 'SQL Databases' },
  { value: 'microsoft.web/sites', label: 'App Services' },
  { value: 'microsoft.storage/storageaccounts', label: 'Storage Accounts' },
  { value: 'microsoft.documentdb/databaseaccounts', label: 'Cosmos DB' },
  { value: 'microsoft.containerinstance/containergroups', label: 'Container Groups' },
  { value: 'microsoft.apimanagement/service', label: 'API Management' },
  { value: 'microsoft.logic/workflows', label: 'Logic Apps' },
  { value: 'microsoft.network/applicationgateways', label: 'Application Gateways' },
  { value: 'microsoft.cache/redis', label: 'Redis Cache' },
];

const TIMEFRAME_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 360, label: '6 hours' },
  { value: 1440, label: '24 hours' },
];

const AGGREGATION_OPTIONS = [
  { value: 'average', label: 'Average' },
  { value: 'max', label: 'Maximum' },
  { value: 'min', label: 'Minimum' },
  { value: 'sum', label: 'Sum' },
];

const CHANNEL_TYPE_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  slack: <MessageSquare className="h-4 w-4" />,
  teams: <Bell className="h-4 w-4" />,
  webhook: <Bell className="h-4 w-4" />,
};

const formSchema = z.object({
  is_template: z.boolean().default(false),
  is_azure_rule: z.boolean().default(false),
  name: z.string().optional(),
  resource_id: z.string().optional(),
  resource_type: z.string().optional(),
  azure_tenant_id: z.string().optional(),
  azure_resource_id: z.string().optional(),
  azure_resource_type: z.string().optional(),
  rule_type: z.string().min(1, 'Rule type is required'),
  comparison_operator: z.string().min(1, 'Comparison operator is required'),
  threshold_value: z.coerce.number().min(0, 'Threshold must be a positive number'),
  timeframe_minutes: z.coerce.number().optional(),
  aggregation_type: z.string().optional(),
  notification_channel_ids: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AlertRuleFormProps {
  rule?: AlertRule;
  onSubmit: (data: FormData & {
    quiet_hours_enabled?: boolean;
    quiet_hours_start?: string | null;
    quiet_hours_end?: string | null;
    quiet_hours_days?: string[] | null;
    quiet_hours_timezone?: string | null;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AlertRuleForm({ rule, onSubmit, onCancel, isLoading }: AlertRuleFormProps) {
  const { data: resources } = useAllResources();
  const { data: notificationChannels } = useNotificationChannels();
  const { data: linkedChannelIds } = useAlertNotificationChannels(rule?.id);
  const { data: azureTenants } = useAzureTenants();
  const updateChannels = useUpdateAlertRuleChannels();

  const enabledChannels = notificationChannels?.filter(c => c.is_enabled) || [];

  // Determine if existing rule is Azure-based
  const isExistingAzureRule = rule ? isAzureRuleType(rule.rule_type) : false;

  // Quiet hours state
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(rule?.quiet_hours_enabled ?? false);
  const [quietHoursStart, setQuietHoursStart] = useState(rule?.quiet_hours_start ?? '22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState(rule?.quiet_hours_end ?? '08:00');
  const [quietHoursDays, setQuietHoursDays] = useState<string[]>(rule?.quiet_hours_days ?? []);
  const [quietHoursTimezone, setQuietHoursTimezone] = useState(rule?.quiet_hours_timezone ?? 'UTC');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      is_template: rule?.is_template || false,
      is_azure_rule: isExistingAzureRule,
      name: rule?.name || '',
      resource_id: rule?.resource_id || '',
      resource_type: rule?.resource_type || '',
      azure_tenant_id: rule?.azure_tenant_id || '',
      azure_resource_id: rule?.azure_resource_id || '',
      azure_resource_type: rule?.azure_resource_type || '',
      rule_type: rule?.rule_type || 'response_time',
      comparison_operator: rule?.comparison_operator || 'gt',
      threshold_value: rule?.threshold_value || 0,
      timeframe_minutes: rule?.timeframe_minutes || 5,
      aggregation_type: rule?.aggregation_type || 'average',
      notification_channel_ids: linkedChannelIds || [],
    },
  });

  // Update form when linkedChannelIds loads
  const currentChannelIds = form.watch('notification_channel_ids');
  useEffect(() => {
    if (linkedChannelIds && linkedChannelIds.length > 0 && (!currentChannelIds || currentChannelIds.length === 0)) {
      form.setValue('notification_channel_ids', linkedChannelIds);
    }
  }, [linkedChannelIds, currentChannelIds, form]);

  const isTemplate = form.watch('is_template');
  const isAzureRule = form.watch('is_azure_rule');
  const selectedTenantId = form.watch('azure_tenant_id');
  const selectedRuleType = form.watch('rule_type');

  // Fetch Azure resources when tenant is selected
  const { data: azureResources } = useAzureResources(selectedTenantId || undefined);

  // Reset rule type when switching between Azure and standard modes
  useEffect(() => {
    const currentRuleType = form.getValues('rule_type');
    if (isAzureRule && !isAzureRuleType(currentRuleType)) {
      form.setValue('rule_type', 'azure_cpu_usage');
    } else if (!isAzureRule && isAzureRuleType(currentRuleType)) {
      form.setValue('rule_type', 'response_time');
    }
  }, [isAzureRule, form]);

  const handleSubmit = async (data: FormData) => {
    // Clean up data based on mode
    const submitData: any = {
      rule_type: data.rule_type,
      comparison_operator: data.comparison_operator,
      threshold_value: data.threshold_value,
      is_template: data.is_template,
      // Include quiet hours settings
      quiet_hours_enabled: quietHoursEnabled,
      quiet_hours_start: quietHoursEnabled ? quietHoursStart : null,
      quiet_hours_end: quietHoursEnabled ? quietHoursEnd : null,
      quiet_hours_days: quietHoursEnabled && quietHoursDays.length > 0 ? quietHoursDays : null,
      quiet_hours_timezone: quietHoursEnabled ? quietHoursTimezone : null,
    };

    if (data.is_azure_rule) {
      // Azure rule
      submitData.azure_tenant_id = data.azure_tenant_id || null;
      submitData.timeframe_minutes = data.timeframe_minutes || 5;
      submitData.aggregation_type = data.aggregation_type || 'average';
      
      if (data.is_template) {
        submitData.name = data.name;
        submitData.azure_resource_type = data.azure_resource_type;
        submitData.azure_resource_id = null;
        submitData.resource_id = null;
        submitData.resource_type = null;
      } else {
        submitData.azure_resource_id = data.azure_resource_id || null;
        submitData.azure_resource_type = null;
        submitData.name = null;
        submitData.resource_id = null;
        submitData.resource_type = null;
      }
    } else {
      // Standard rule
      submitData.azure_tenant_id = null;
      submitData.azure_resource_id = null;
      submitData.azure_resource_type = null;
      submitData.timeframe_minutes = null;
      submitData.aggregation_type = null;
      
      if (data.is_template) {
        submitData.name = data.name;
        submitData.resource_type = data.resource_type;
        submitData.resource_id = null;
      } else {
        submitData.resource_id = data.resource_id;
        submitData.resource_type = null;
        submitData.name = null;
      }
    }
    
    // Pass channel IDs to parent
    onSubmit({ ...submitData, notification_channel_ids: data.notification_channel_ids });
  };

  // Get the applicable rule types based on Azure mode
  const applicableRuleTypes = isAzureRule ? AZURE_RULE_TYPES : STANDARD_RULE_TYPES;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Rule Target Mode Toggle */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <FormLabel className="text-sm font-medium">Rule Target</FormLabel>
              <FormDescription className="text-xs">
                Choose between standard resources or Azure resources
              </FormDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={!isAzureRule ? 'default' : 'outline'}
              size="sm"
              onClick={() => form.setValue('is_azure_rule', false)}
              className="flex items-center gap-2"
            >
              <Server className="h-4 w-4" />
              Standard Resource
            </Button>
            <Button
              type="button"
              variant={isAzureRule ? 'default' : 'outline'}
              size="sm"
              onClick={() => form.setValue('is_azure_rule', true)}
              className="flex items-center gap-2"
            >
              <Cloud className="h-4 w-4" />
              Azure Resource
            </Button>
          </div>
        </div>

        {/* Template Toggle */}
        <FormField
          control={form.control}
          name="is_template"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Template Rule</FormLabel>
                <FormDescription>
                  Apply to all {isAzureRule ? 'Azure' : ''} resources of a type
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Azure-specific fields */}
        {isAzureRule && (
          <>
            <FormField
              control={form.control}
              name="azure_tenant_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Azure Tenant</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Azure tenant" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {azureTenants?.map((tenant) => (
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

            {isTemplate ? (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., High CPU Alert - VMs" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="azure_resource_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Azure Resource Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Azure resource type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AZURE_RESOURCE_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This rule will apply to all Azure resources of this type
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <FormField
                control={form.control}
                name="azure_resource_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Azure Resource</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedTenantId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedTenantId ? "Select Azure resource" : "Select a tenant first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {azureResources?.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id}>
                            {resource.name} ({resource.resource_type.split('/').pop()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        {/* Standard resource fields */}
        {!isAzureRule && (
          <>
            {isTemplate ? (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Website Response Time Alert" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="resource_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resource Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select resource type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RESOURCE_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This rule will apply to all {form.watch('resource_type') || 'selected type'} resources
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <FormField
                control={form.control}
                name="resource_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a resource" />
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
          </>
        )}

        {/* Rule Type */}
        <FormField
          control={form.control}
          name="rule_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rule Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rule type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {applicableRuleTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {RULE_TYPE_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {RULE_TYPE_DESCRIPTIONS[field.value] || 'Select a rule type'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Condition and Threshold */}
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
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COMPARISON_OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
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
            name="threshold_value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Threshold Value</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Timeframe Configuration (Azure rules only) */}
        {isAzureRule && (
          <div className="rounded-lg border p-3 space-y-3">
            <FormLabel className="text-sm font-medium">Timeframe Configuration</FormLabel>
            <FormDescription className="text-xs">
              Configure how metric data is evaluated over time
            </FormDescription>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeframe_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Evaluate over</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(parseInt(v))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIMEFRAME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value.toString()}>
                            {opt.label}
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
                name="aggregation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Using</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select aggregation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AGGREGATION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-xs text-muted-foreground italic">
              "Alert if {form.watch('aggregation_type') || 'average'} {RULE_TYPE_LABELS[selectedRuleType] || 'metric'} {
                COMPARISON_OPERATORS.find(o => o.value === form.watch('comparison_operator'))?.label.toLowerCase() || '>'
              } {form.watch('threshold_value') || 0} over the last {
                TIMEFRAME_OPTIONS.find(o => o.value === form.watch('timeframe_minutes'))?.label || '5 minutes'
              }"
            </p>
          </div>
        )}

        {/* Notification Channels */}
        <FormField
          control={form.control}
          name="notification_channel_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notification Channels</FormLabel>
              <FormDescription>
                Select which channels receive alerts from this rule.
              </FormDescription>
              <div className="space-y-2 rounded-lg border p-3">
                {enabledChannels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No notification channels configured</p>
                ) : (
                  enabledChannels.map((channel) => (
                    <div key={channel.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={channel.id}
                        checked={field.value?.includes(channel.id) || false}
                        onCheckedChange={(checked) => {
                          const current = field.value || [];
                          if (checked) {
                            field.onChange([...current, channel.id]);
                          } else {
                            field.onChange(current.filter(id => id !== channel.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={channel.id}
                        className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {CHANNEL_TYPE_ICONS[channel.channel_type] || <Bell className="h-4 w-4" />}
                        {channel.name}
                        <span className="text-xs text-muted-foreground">({channel.channel_type})</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
              <FormMessage />
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

        <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-background pb-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
