import { useState } from 'react';
import { format } from 'date-fns';
import { Bell, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Layout, Cloud, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAlertRules, useCreateAlertRule, useUpdateAlertRule, useDeleteAlertRule, useToggleAlertRule, AlertRule, isAzureRuleType } from '@/hooks/useAlertRules';
import { useUpdateAlertRuleChannels } from '@/hooks/useAlertNotificationChannels';
import { AlertRuleForm } from './AlertRuleForm';
import { useAuth } from '@/contexts/AuthContext';
import { useAllResources } from '@/hooks/useResources';

const RULE_TYPE_LABELS: Record<string, string> = {
  response_time: 'Response Time',
  uptime: 'Uptime',
  ssl_expiry: 'SSL Expiry',
  status_code: 'Status Code',
  consecutive_failures: 'Consecutive Failures',
  downtime: 'Downtime',
  // Azure rule types
  azure_cpu_usage: 'CPU Usage',
  azure_memory_usage: 'Memory Usage',
  azure_dtu_usage: 'DTU Usage',
  azure_storage_usage: 'Storage Usage',
  azure_network_in: 'Network In',
  azure_network_out: 'Network Out',
  azure_http_errors: 'HTTP Errors',
  azure_response_time: 'Response Time',
  azure_requests: 'Requests',
  azure_disk_read: 'Disk Read',
  azure_disk_write: 'Disk Write',
  azure_transactions: 'Transactions',
  azure_availability: 'Availability',
};

const COMPARISON_LABELS: Record<string, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  eq: '=',
  neq: '≠',
};

const AGGREGATION_LABELS: Record<string, string> = {
  average: 'avg',
  max: 'max',
  min: 'min',
  sum: 'sum',
};

const AZURE_RESOURCE_TYPE_LABELS: Record<string, string> = {
  'microsoft.compute/virtualmachines': 'Virtual Machines',
  'microsoft.sql/servers/databases': 'SQL Databases',
  'microsoft.web/sites': 'App Services',
  'microsoft.storage/storageaccounts': 'Storage Accounts',
  'microsoft.documentdb/databaseaccounts': 'Cosmos DB',
  'microsoft.containerinstance/containergroups': 'Container Groups',
  'microsoft.apimanagement/service': 'API Management',
  'microsoft.logic/workflows': 'Logic Apps',
  'microsoft.network/applicationgateways': 'Application Gateways',
  'microsoft.cache/redis': 'Redis Cache',
};

export function AlertRuleList() {
  const { isAdmin, isEditor } = useAuth();
  const { data: rules, isLoading } = useAlertRules();
  const { data: allResources } = useAllResources();
  const createRule = useCreateAlertRule();
  const updateRule = useUpdateAlertRule();
  const deleteRule = useDeleteAlertRule();
  const toggleRule = useToggleAlertRule();
  const updateChannels = useUpdateAlertRuleChannels();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const handleCreate = async (data: any) => {
    const { notification_channel_ids, ...ruleData } = data;
    const newRule = await createRule.mutateAsync(ruleData);
    
    // Link notification channels if any selected
    if (notification_channel_ids?.length > 0) {
      await updateChannels.mutateAsync({ 
        alertRuleId: newRule.id, 
        channelIds: notification_channel_ids 
      });
    }
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: any) => {
    if (!editingRule) return;
    const { notification_channel_ids, ...ruleData } = data;
    await updateRule.mutateAsync({ id: editingRule.id, ...ruleData });
    
    // Update notification channel links
    await updateChannels.mutateAsync({ 
      alertRuleId: editingRule.id, 
      channelIds: notification_channel_ids || [] 
    });
    setEditingRule(null);
  };

  // Count resources by type for template rules
  const getResourceCountForType = (resourceType: string) => {
    return allResources?.filter(r => r.resource_type === resourceType).length || 0;
  };

  // Separate rules into categories
  const azureRules = rules?.filter(r => isAzureRuleType(r.rule_type)) || [];
  const standardRules = rules?.filter(r => !isAzureRuleType(r.rule_type)) || [];
  
  const azureTemplateRules = azureRules.filter(r => r.is_template);
  const azureDirectRules = azureRules.filter(r => !r.is_template);
  const standardTemplateRules = standardRules.filter(r => r.is_template);
  const standardDirectRules = standardRules.filter(r => !r.is_template);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const renderRuleCard = (rule: AlertRule) => {
    const isTemplate = rule.is_template;
    const isAzure = isAzureRuleType(rule.rule_type);
    const resourceCount = isTemplate && !isAzure ? getResourceCountForType(rule.resource_type || '') : null;

    // Determine the display name
    let displayName = 'Unknown Resource';
    if (isTemplate) {
      displayName = rule.name || 'Unnamed Template';
    } else if (isAzure) {
      displayName = (rule.azure_resources as any)?.name || 'Azure Resource';
    } else {
      displayName = (rule.resources as any)?.name || 'Unknown Resource';
    }

    // Build the rule summary
    const ruleTypeLabel = RULE_TYPE_LABELS[rule.rule_type] || rule.rule_type;
    const comparisonLabel = COMPARISON_LABELS[rule.comparison_operator] || rule.comparison_operator;
    
    let ruleSummary = `${ruleTypeLabel} ${comparisonLabel} ${rule.threshold_value}`;
    
    if (isAzure && rule.timeframe_minutes && rule.aggregation_type) {
      const aggLabel = AGGREGATION_LABELS[rule.aggregation_type] || rule.aggregation_type;
      ruleSummary = `${ruleTypeLabel} ${comparisonLabel} ${rule.threshold_value} (${aggLabel} over ${rule.timeframe_minutes}min)`;
    }

    // Get Azure resource type label for templates
    const azureResourceTypeLabel = rule.azure_resource_type 
      ? AZURE_RESOURCE_TYPE_LABELS[rule.azure_resource_type.toLowerCase()] || rule.azure_resource_type.split('/').pop()
      : null;

    return (
      <Card key={rule.id}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isAzure ? (
                <Cloud className="h-5 w-5 text-blue-500" />
              ) : isTemplate ? (
                <Layout className="h-5 w-5 text-primary" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                  {displayName}
                  {isTemplate && <Badge variant="outline" className="ml-2">Template</Badge>}
                  {isAzure && <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Azure</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {isTemplate && isAzure && azureResourceTypeLabel && (
                    <span className="text-blue-600 font-medium">
                      All {azureResourceTypeLabel} •{' '}
                    </span>
                  )}
                  {isTemplate && !isAzure && (
                    <span className="text-primary font-medium">
                      All {rule.resource_type}s ({resourceCount} resources) •{' '}
                    </span>
                  )}
                  {ruleSummary}
                </p>
                {isAzure && (rule.azure_tenants as any)?.name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Tenant: {(rule.azure_tenants as any).name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAzure && rule.timeframe_minutes && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {rule.timeframe_minutes}m
                </Badge>
              )}
              <Badge variant={rule.is_enabled ? 'default' : 'secondary'}>
                {rule.is_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Created: {format(new Date(rule.created_at), 'PPp')}
            </p>
            {isEditor && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleRule.mutate({ id: rule.id, is_enabled: !rule.is_enabled })}
                >
                  {rule.is_enabled ? (
                    <ToggleRight className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </Button>
                <Dialog open={editingRule?.id === rule.id} onOpenChange={(open) => !open && setEditingRule(null)}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setEditingRule(rule)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Edit Alert Rule</DialogTitle>
                    </DialogHeader>
                    <AlertRuleForm
                      rule={rule}
                      onSubmit={handleUpdate}
                      onCancel={() => setEditingRule(null)}
                      isLoading={updateRule.isPending}
                    />
                  </DialogContent>
                </Dialog>
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Alert Rule</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this alert rule? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteRule.mutate(rule.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const hasRules = rules && rules.length > 0;

  return (
    <div className="space-y-6">
      {isEditor && (
        <div className="flex justify-end">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Alert Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Alert Rule</DialogTitle>
              </DialogHeader>
              <AlertRuleForm
                onSubmit={handleCreate}
                onCancel={() => setIsCreateOpen(false)}
                isLoading={createRule.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      )}

      {!hasRules ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No alert rules configured</p>
            {isEditor && (
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Create your first alert rule
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Azure Rules Section */}
          {(azureTemplateRules.length > 0 || azureDirectRules.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Cloud className="h-5 w-5 text-blue-500" />
                Azure Alert Rules
              </h3>
              <p className="text-sm text-muted-foreground">
                Rules based on Azure resource metrics with timeframe-based evaluation.
              </p>
              
              {azureTemplateRules.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Layout className="h-4 w-4" />
                    Azure Template Rules
                  </h4>
                  <div className="grid gap-4">
                    {azureTemplateRules.map(renderRuleCard)}
                  </div>
                </div>
              )}
              
              {azureDirectRules.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Bell className="h-4 w-4" />
                    Azure Direct Rules
                  </h4>
                  <div className="grid gap-4">
                    {azureDirectRules.map(renderRuleCard)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standard Rules Section */}
          {(standardTemplateRules.length > 0 || standardDirectRules.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Standard Alert Rules
              </h3>
              <p className="text-sm text-muted-foreground">
                Rules based on monitoring checks for websites, APIs, and servers.
              </p>
              
              {standardTemplateRules.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Layout className="h-4 w-4" />
                    Template Rules
                  </h4>
                  <div className="grid gap-4">
                    {standardTemplateRules.map(renderRuleCard)}
                  </div>
                </div>
              )}
              
              {standardDirectRules.length > 0 && (
                <div className="space-y-3">
                  {standardTemplateRules.length > 0 && (
                    <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Bell className="h-4 w-4" />
                      Direct Rules
                    </h4>
                  )}
                  <div className="grid gap-4">
                    {standardDirectRules.map(renderRuleCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
