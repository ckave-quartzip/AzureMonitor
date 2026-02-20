import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MonitoringCheck } from '@/hooks/useMonitoringChecks';
import { Copy, Cloud, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CHECK_TYPES = [
  { value: 'http', label: 'HTTP/HTTPS', description: 'Monitor web endpoints' },
  { value: 'keyword', label: 'Keyword', description: 'Check for keyword in response' },
  { value: 'ping', label: 'Ping (ICMP)', description: 'Check server availability' },
  { value: 'ssl', label: 'SSL Certificate', description: 'Monitor SSL expiry' },
  { value: 'port', label: 'Port Check', description: 'Check if port is open' },
  { value: 'heartbeat', label: 'Heartbeat', description: 'Receive pings from your services' },
  { value: 'azure_metric', label: 'Azure Metric', description: 'Monitor Azure resource metrics' },
  { value: 'azure_health', label: 'Azure Health', description: 'Monitor Azure resource health status' },
] as const;

const HTTP_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

const AUTH_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
] as const;

const TIMEFRAME_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
] as const;

const AGGREGATION_TYPES = [
  { value: 'average', label: 'Average' },
  { value: 'max', label: 'Maximum' },
  { value: 'min', label: 'Minimum' },
  { value: 'total', label: 'Total' },
] as const;

const COMPARISON_OPERATORS = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
] as const;

// Common Azure metrics by resource type
const AZURE_METRICS_BY_TYPE: Record<string, { name: string; namespace: string; label: string }[]> = {
  'microsoft.compute/virtualmachines': [
    { name: 'Percentage CPU', namespace: 'Microsoft.Compute/virtualMachines', label: 'CPU Percentage' },
    { name: 'Available Memory Bytes', namespace: 'Microsoft.Compute/virtualMachines', label: 'Available Memory' },
    { name: 'Disk Read Bytes', namespace: 'Microsoft.Compute/virtualMachines', label: 'Disk Read' },
    { name: 'Disk Write Bytes', namespace: 'Microsoft.Compute/virtualMachines', label: 'Disk Write' },
    { name: 'Network In Total', namespace: 'Microsoft.Compute/virtualMachines', label: 'Network In' },
    { name: 'Network Out Total', namespace: 'Microsoft.Compute/virtualMachines', label: 'Network Out' },
  ],
  'microsoft.sql/servers/databases': [
    { name: 'dtu_consumption_percent', namespace: 'Microsoft.Sql/servers/databases', label: 'DTU Percentage' },
    { name: 'cpu_percent', namespace: 'Microsoft.Sql/servers/databases', label: 'CPU Percentage' },
    { name: 'storage_percent', namespace: 'Microsoft.Sql/servers/databases', label: 'Storage Percentage' },
    { name: 'connection_successful', namespace: 'Microsoft.Sql/servers/databases', label: 'Successful Connections' },
    { name: 'deadlock', namespace: 'Microsoft.Sql/servers/databases', label: 'Deadlocks' },
  ],
  'microsoft.web/sites': [
    { name: 'Requests', namespace: 'Microsoft.Web/sites', label: 'Request Count' },
    { name: 'AverageResponseTime', namespace: 'Microsoft.Web/sites', label: 'Avg Response Time' },
    { name: 'CpuTime', namespace: 'Microsoft.Web/sites', label: 'CPU Time' },
    { name: 'Http5xx', namespace: 'Microsoft.Web/sites', label: 'HTTP 5xx Errors' },
    { name: 'Http4xx', namespace: 'Microsoft.Web/sites', label: 'HTTP 4xx Errors' },
    { name: 'MemoryWorkingSet', namespace: 'Microsoft.Web/sites', label: 'Memory Working Set' },
  ],
  'microsoft.storage/storageaccounts': [
    { name: 'Transactions', namespace: 'Microsoft.Storage/storageAccounts', label: 'Transactions' },
    { name: 'Ingress', namespace: 'Microsoft.Storage/storageAccounts', label: 'Ingress' },
    { name: 'Egress', namespace: 'Microsoft.Storage/storageAccounts', label: 'Egress' },
    { name: 'UsedCapacity', namespace: 'Microsoft.Storage/storageAccounts', label: 'Used Capacity' },
  ],
};

// Default metrics for unknown resource types
const DEFAULT_AZURE_METRICS = [
  { name: 'Percentage CPU', namespace: 'Microsoft.Compute/virtualMachines', label: 'CPU Percentage' },
  { name: 'UsedCapacity', namespace: 'Microsoft.Storage/storageAccounts', label: 'Used Capacity' },
];

const formSchema = z.object({
  check_type: z.enum(['http', 'keyword', 'ping', 'ssl', 'port', 'heartbeat', 'azure_metric', 'azure_health']),
  url: z.string().optional(),
  ip_address: z.string().optional(),
  port: z.coerce.number().min(1).max(65535).optional().nullable(),
  expected_status_code: z.coerce.number().min(100).max(599).optional().nullable(),
  check_interval_seconds: z.coerce.number().min(30).max(86400),
  timeout_seconds: z.coerce.number().min(5).max(300),
  // New fields
  keyword_value: z.string().optional(),
  keyword_type: z.enum(['contains', 'not_contains']).optional(),
  http_method: z.enum(['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
  http_auth_type: z.enum(['none', 'basic', 'bearer']).optional(),
  http_auth_username: z.string().optional(),
  http_auth_password: z.string().optional(),
  http_auth_token: z.string().optional(),
  custom_headers: z.string().optional(),
  failure_threshold: z.coerce.number().min(1).max(10).optional(),
  heartbeat_interval_seconds: z.coerce.number().min(60).max(86400).optional().nullable(),
  // Retry configuration
  retry_count: z.coerce.number().min(0).max(10).optional(),
  retry_delay_ms: z.coerce.number().min(500).max(30000).optional(),
  confirmation_delay_ms: z.coerce.number().min(1000).max(60000).optional(),
  // Azure metric fields
  azure_metric_name: z.string().optional(),
  azure_metric_namespace: z.string().optional(),
  timeframe_minutes: z.coerce.number().min(5).max(60).optional(),
  aggregation_type: z.enum(['average', 'max', 'min', 'total']).optional(),
  metric_threshold_value: z.coerce.number().optional(),
  metric_comparison_operator: z.enum(['gt', 'gte', 'lt', 'lte']).optional(),
}).refine((data) => {
  if (data.check_type === 'http' || data.check_type === 'ssl') {
    return !!data.url && data.url.length > 0;
  }
  if (data.check_type === 'keyword') {
    return !!data.url && data.url.length > 0 && !!data.keyword_value && data.keyword_value.length > 0;
  }
  if (data.check_type === 'ping') {
    return !!data.ip_address && data.ip_address.length > 0;
  }
  if (data.check_type === 'port') {
    return !!data.ip_address && data.ip_address.length > 0 && !!data.port;
  }
  if (data.check_type === 'heartbeat') {
    return !!data.heartbeat_interval_seconds && data.heartbeat_interval_seconds > 0;
  }
  if (data.check_type === 'azure_metric') {
    return !!data.azure_metric_name && data.metric_threshold_value !== undefined;
  }
  return true;
}, {
  message: 'Please provide the required fields for this check type',
  path: ['url'],
});

type FormData = z.infer<typeof formSchema>;

interface MonitoringCheckFormProps {
  check?: MonitoringCheck;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
  azureResourceId?: string | null;
  azureResourceType?: string | null;
}

export function MonitoringCheckForm({ 
  check, 
  onSubmit, 
  onCancel, 
  isLoading,
  azureResourceId,
  azureResourceType 
}: MonitoringCheckFormProps) {
  const existingCredentials = check?.http_auth_credentials as { username?: string; password?: string; token?: string } | null;
  const existingHeaders = check?.custom_headers as Record<string, string> | null;
  
  // Get available metrics for this resource type
  const normalizedType = azureResourceType?.toLowerCase() || '';
  const availableMetrics = AZURE_METRICS_BY_TYPE[normalizedType] || DEFAULT_AZURE_METRICS;
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      check_type: (check?.check_type as FormData['check_type']) || 'http',
      url: check?.url || '',
      ip_address: check?.ip_address || '',
      port: check?.port || null,
      expected_status_code: check?.expected_status_code || 200,
      check_interval_seconds: check?.check_interval_seconds || 60,
      timeout_seconds: check?.timeout_seconds || 30,
      keyword_value: check?.keyword_value || '',
      keyword_type: (check?.keyword_type as 'contains' | 'not_contains') || 'contains',
      http_method: (check?.http_method as FormData['http_method']) || 'GET',
      http_auth_type: (check?.http_auth_type as FormData['http_auth_type']) || 'none',
      http_auth_username: existingCredentials?.username || '',
      http_auth_password: existingCredentials?.password || '',
      http_auth_token: existingCredentials?.token || '',
      custom_headers: existingHeaders ? JSON.stringify(existingHeaders, null, 2) : '',
      failure_threshold: check?.failure_threshold || 1,
      heartbeat_interval_seconds: check?.heartbeat_interval_seconds || 300,
      // Retry settings
      retry_count: (check as any)?.retry_count ?? 3,
      retry_delay_ms: (check as any)?.retry_delay_ms ?? 2000,
      confirmation_delay_ms: (check as any)?.confirmation_delay_ms ?? 5000,
      // Azure metric settings
      azure_metric_name: (check as any)?.azure_metric_name || '',
      azure_metric_namespace: (check as any)?.azure_metric_namespace || '',
      timeframe_minutes: (check as any)?.timeframe_minutes || 5,
      aggregation_type: ((check as any)?.aggregation_type as FormData['aggregation_type']) || 'average',
      metric_threshold_value: (check as any)?.metric_threshold_value || undefined,
      metric_comparison_operator: ((check as any)?.metric_comparison_operator as FormData['metric_comparison_operator']) || 'gt',
    },
  });

  const checkType = form.watch('check_type');
  const authType = form.watch('http_auth_type');
  const selectedMetricName = form.watch('azure_metric_name');

  const isAzureCheck = checkType === 'azure_metric' || checkType === 'azure_health';
  const hasAzureResource = !!azureResourceId;

  const handleSubmit = (data: FormData) => {
    // Build the clean data object
    const cleanData: any = {
      check_type: data.check_type,
      check_interval_seconds: data.check_interval_seconds,
      timeout_seconds: data.timeout_seconds,
      failure_threshold: data.failure_threshold || 1,
      // Retry settings
      retry_count: data.retry_count ?? 3,
      retry_delay_ms: data.retry_delay_ms ?? 2000,
      confirmation_delay_ms: data.confirmation_delay_ms ?? 5000,
    };

    // Handle different check types
    if (checkType === 'http' || checkType === 'keyword' || checkType === 'ssl') {
      cleanData.url = data.url;
      cleanData.http_method = data.http_method || 'GET';
      
      // Build auth credentials
      if (data.http_auth_type && data.http_auth_type !== 'none') {
        cleanData.http_auth_type = data.http_auth_type;
        if (data.http_auth_type === 'basic') {
          cleanData.http_auth_credentials = {
            username: data.http_auth_username,
            password: data.http_auth_password,
          };
        } else if (data.http_auth_type === 'bearer') {
          cleanData.http_auth_credentials = {
            token: data.http_auth_token,
          };
        }
      } else {
        cleanData.http_auth_type = null;
        cleanData.http_auth_credentials = null;
      }
      
      // Parse custom headers
      if (data.custom_headers && data.custom_headers.trim()) {
        try {
          cleanData.custom_headers = JSON.parse(data.custom_headers);
        } catch {
          cleanData.custom_headers = null;
        }
      } else {
        cleanData.custom_headers = null;
      }
      
      // Keyword specific
      if (checkType === 'keyword') {
        cleanData.keyword_value = data.keyword_value;
        cleanData.keyword_type = data.keyword_type;
      }
      
      // HTTP specific
      if (checkType === 'http') {
        cleanData.expected_status_code = data.expected_status_code;
      }
    } else if (checkType === 'ping') {
      cleanData.ip_address = data.ip_address;
    } else if (checkType === 'port') {
      cleanData.ip_address = data.ip_address;
      cleanData.port = data.port;
    } else if (checkType === 'heartbeat') {
      cleanData.heartbeat_interval_seconds = data.heartbeat_interval_seconds;
    } else if (checkType === 'azure_metric') {
      // Azure metric specific fields
      cleanData.azure_metric_name = data.azure_metric_name;
      cleanData.azure_metric_namespace = data.azure_metric_namespace;
      cleanData.timeframe_minutes = data.timeframe_minutes || 5;
      cleanData.aggregation_type = data.aggregation_type || 'average';
      cleanData.metric_threshold_value = data.metric_threshold_value;
      cleanData.metric_comparison_operator = data.metric_comparison_operator || 'gt';
    } else if (checkType === 'azure_health') {
      // Azure health checks don't need additional configuration
      // They use the resource's azure_resource_id via the resource relationship
    }

    onSubmit(cleanData);
  };

  const copyHeartbeatUrl = () => {
    if (check?.heartbeat_token) {
      const url = `https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/receive-heartbeat?token=${check.heartbeat_token}`;
      navigator.clipboard.writeText(url);
      toast.success('Heartbeat URL copied to clipboard');
    }
  };

  // Handle metric selection and auto-populate namespace
  const handleMetricChange = (metricName: string) => {
    form.setValue('azure_metric_name', metricName);
    const selectedMetric = availableMetrics.find(m => m.name === metricName);
    if (selectedMetric) {
      form.setValue('azure_metric_namespace', selectedMetric.namespace);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <FormField
          control={form.control}
          name="check_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Check Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select check type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CHECK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {(type.value === 'azure_metric' || type.value === 'azure_health') && (
                            <Cloud className="h-3 w-3 text-blue-500" />
                          )}
                          <span>{type.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Azure check warning if no Azure resource linked */}
        {isAzureCheck && !hasAzureResource && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This resource is not linked to an Azure resource. Link an Azure resource first to use Azure metric checks.
            </AlertDescription>
          </Alert>
        )}

        {/* Azure Metric check specific fields */}
        {checkType === 'azure_metric' && hasAzureResource && (
          <>
            <FormField
              control={form.control}
              name="azure_metric_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metric</FormLabel>
                  <Select onValueChange={handleMetricChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select metric to monitor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableMetrics.map((metric) => (
                        <SelectItem key={metric.name} value={metric.name}>
                          {metric.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The Azure metric to monitor
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeframe_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timeframe</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
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
                    <FormLabel>Aggregation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select aggregation" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AGGREGATION_TYPES.map((agg) => (
                          <SelectItem key={agg.value} value={agg.value}>
                            {agg.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-end gap-2">
              <FormField
                control={form.control}
                name="metric_comparison_operator"
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormLabel>Condition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Op" />
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
                name="metric_threshold_value"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Threshold Value</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="80" 
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormDescription>
              Alert when {selectedMetricName || 'metric'} {form.watch('aggregation_type') || 'average'} over {form.watch('timeframe_minutes') || 5} minutes exceeds threshold
            </FormDescription>
          </>
        )}

        {/* Azure Health check info */}
        {checkType === 'azure_health' && hasAzureResource && (
          <div className="rounded-md border p-3 bg-muted/50">
            <p className="text-sm font-medium mb-2">Azure Health Check</p>
            <p className="text-xs text-muted-foreground">
              This check monitors the health status of the linked Azure resource. It will alert when the resource reports a degraded or unhealthy state.
            </p>
          </div>
        )}

        {/* Heartbeat check specific fields */}
        {checkType === 'heartbeat' && (
          <>
            <FormField
              control={form.control}
              name="heartbeat_interval_seconds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Interval (seconds)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="300" 
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormDescription>
                    How often your service should send a heartbeat (e.g., 300 = every 5 minutes)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {check?.heartbeat_token && (
              <div className="rounded-md border p-3 bg-muted/50">
                <p className="text-sm font-medium mb-2">Heartbeat URL</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Have your service call this URL to send a heartbeat:
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background p-2 rounded flex-1 overflow-x-auto">
                    GET /functions/v1/receive-heartbeat?token={check.heartbeat_token}
                  </code>
                  <Button type="button" variant="outline" size="sm" onClick={copyHeartbeatUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* URL field for http, keyword, ssl */}
        {(checkType === 'http' || checkType === 'ssl' || checkType === 'keyword') && (
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="https://example.com" 
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  {checkType === 'http' 
                    ? 'The full URL to monitor (including protocol)'
                    : checkType === 'keyword'
                    ? 'The URL to fetch and search for keyword'
                    : 'The HTTPS URL to check SSL certificate'
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Keyword specific fields */}
        {checkType === 'keyword' && (
          <>
            <FormField
              control={form.control}
              name="keyword_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keyword</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter keyword to search for" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    The text to search for in the response body
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keyword_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select match type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="contains">Contains keyword</SelectItem>
                      <SelectItem value="not_contains">Does NOT contain keyword</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* IP Address for ping/port */}
        {(checkType === 'ping' || checkType === 'port') && (
          <FormField
            control={form.control}
            name="ip_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IP Address / Hostname</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="192.168.1.1 or example.com" 
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  The IP address or hostname to check
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Port for port check */}
        {checkType === 'port' && (
          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="443" 
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
                <FormDescription>
                  The port number to check (1-65535)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* HTTP method for http/keyword */}
        {(checkType === 'http' || checkType === 'keyword') && (
          <FormField
            control={form.control}
            name="http_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HTTP Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HTTP_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Expected status code for http */}
        {checkType === 'http' && (
          <FormField
            control={form.control}
            name="expected_status_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Status Code</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="200" 
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
                <FormDescription>
                  Expected HTTP status code (e.g., 200, 301)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Failure threshold - show for all except heartbeat */}
        {checkType !== 'heartbeat' && (
          <FormField
            control={form.control}
            name="failure_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Failure Threshold</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={1}
                    max={10}
                    {...field}
                    value={field.value || 1}
                  />
                </FormControl>
                <FormDescription>
                  Number of consecutive failures before alerting (1-10)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Interval and timeout */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="check_interval_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check Interval (seconds)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  How often to run the check
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timeout_seconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timeout (seconds)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  Max wait time for response
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Advanced options accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="advanced">
            <AccordionTrigger>Advanced Options</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* HTTP-specific authentication - only for http/keyword */}
              {(checkType === 'http' || checkType === 'keyword') && (
                <>
                  <FormField
                    control={form.control}
                    name="http_auth_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select auth type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AUTH_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Basic auth fields */}
                  {authType === 'basic' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="http_auth_username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="http_auth_password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="password" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Bearer token field */}
                  {authType === 'bearer' && (
                    <FormField
                      control={form.control}
                      name="http_auth_token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bearer Token</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter bearer token" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Custom headers */}
                  <FormField
                    control={form.control}
                    name="custom_headers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Headers (JSON)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder='{"X-Custom-Header": "value"}'
                            className="font-mono text-sm"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Custom headers as JSON object
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Retry Settings - available for all check types except heartbeat and azure checks */}
              {checkType !== 'heartbeat' && !isAzureCheck && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-medium mb-3">Retry Settings</h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      Configure how failed checks are retried to reduce false positives
                    </p>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="retry_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Retry Count</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0}
                            max={10}
                            {...field}
                            value={field.value ?? 3}
                          />
                        </FormControl>
                        <FormDescription>
                          Number of retries before marking as failed (0-10). Set to 0 to disable retries.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="retry_delay_ms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retry Delay (ms)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={500}
                              max={30000}
                              step={500}
                              {...field}
                              value={field.value ?? 2000}
                            />
                          </FormControl>
                          <FormDescription>
                            Wait between retries (500-30000ms)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmation_delay_ms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmation Delay (ms)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1000}
                              max={60000}
                              step={1000}
                              {...field}
                              value={field.value ?? 5000}
                            />
                          </FormControl>
                          <FormDescription>
                            Wait before final confirmation (1000-60000ms)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || (isAzureCheck && !hasAzureResource)}>
            {isLoading ? 'Saving...' : check ? 'Update Check' : 'Create Check'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
