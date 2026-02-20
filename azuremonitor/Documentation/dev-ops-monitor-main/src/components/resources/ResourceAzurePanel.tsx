import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Cloud, ExternalLink, MapPin, Folder, Tag, DollarSign, Activity, 
  Server, Database, Globe, HardDrive, RefreshCw 
} from 'lucide-react';
import { useResourceAzureDetails, useResourceAzureCost, useResourceAzureMetrics } from '@/hooks/useResourceAzureDetails';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { SqlPerformanceSummary } from '@/components/azure/SqlPerformanceSummary';
import { SqlQueryInsights } from '@/components/azure/SqlQueryInsights';
import { SqlMissingIndexList } from '@/components/azure/SqlMissingIndexList';
import { SqlWaitStats } from '@/components/azure/SqlWaitStats';
import { SqlStorageDashboard } from '@/components/azure/SqlStorageDashboard';
import { SqlReplicationDashboard } from '@/components/azure/SqlReplicationDashboard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ResourceAzurePanelProps {
  azureResourceId: string;
  tenantId?: string;
}

// Map resource types to icons
function getResourceIcon(resourceType: string) {
  const type = resourceType.toLowerCase();
  if (type.includes('sql') || type.includes('database')) return Database;
  if (type.includes('web') || type.includes('site')) return Globe;
  if (type.includes('storage')) return HardDrive;
  if (type.includes('virtual') || type.includes('compute')) return Server;
  return Cloud;
}

// Check if resource is SQL-related
function isSqlResource(resourceType: string): boolean {
  const type = resourceType.toLowerCase();
  return type.includes('sql') || type.includes('database');
}

// Format resource type for display
function formatResourceType(resourceType: string): string {
  const parts = resourceType.split('/');
  return parts[parts.length - 1] || resourceType;
}

// Format metric name
function formatMetricName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Build Azure Portal URL
function buildAzurePortalUrl(azureResourceId: string): string {
  return `https://portal.azure.com/#@/resource${azureResourceId}`;
}

export function ResourceAzurePanel({ azureResourceId, tenantId }: ResourceAzurePanelProps) {
  const { data: azureResource, isLoading: isLoadingResource } = useResourceAzureDetails(azureResourceId);
  const { data: costData, isLoading: isLoadingCost } = useResourceAzureCost(azureResourceId);
  const { data: metricsData, isLoading: isLoadingMetrics } = useResourceAzureMetrics(azureResourceId);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncSqlInsights = async () => {
    if (!azureResource?.azure_tenant_id) {
      toast({
        title: 'Missing tenant',
        description: 'Could not determine Azure tenant for this resource',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('azure-sql-insights', {
        body: {
          action: 'sync',
          tenantId: azureResource.azure_tenant_id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Sync complete',
        description: `Synced ${data.insights_count || 0} query insights, ${data.performance_stats_count || 0} metrics`,
      });
    } catch (error) {
      console.error('SQL sync error:', error);
      toast({
        title: 'Sync failed',
        description: 'Failed to sync SQL insights',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoadingResource) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!azureResource) {
    return null;
  }

  const ResourceIcon = getResourceIcon(azureResource.resource_type);
  const metricNames = Object.keys(metricsData || {});
  const tags = azureResource.tags || {};
  const tagEntries = Object.entries(tags);
  const showSqlTab = isSqlResource(azureResource.resource_type);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: costData?.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Cloud className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Azure Resource
                <Badge variant="secondary" className="gap-1">
                  <ResourceIcon className="h-3 w-3" />
                  {formatResourceType(azureResource.resource_type)}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Linked Azure resource details and metrics
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a 
              href={buildAzurePortalUrl(azureResource.azure_resource_id)} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open in Azure
            </a>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className={`grid w-full ${showSqlTab ? 'grid-cols-6' : 'grid-cols-3'}`}>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="cost">Cost</TabsTrigger>
            {showSqlTab && (
              <>
                <TabsTrigger value="sql">SQL Insights</TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
                <TabsTrigger value="replication">Replication</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Cloud className="h-3 w-3" />
                  Name
                </p>
                <p className="text-sm font-medium">{azureResource.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location
                </p>
                <p className="text-sm font-medium">{azureResource.location}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  Resource Group
                </p>
                <p className="text-sm font-medium">{azureResource.resource_group}</p>
              </div>
              {azureResource.sku?.name && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    SKU
                  </p>
                  <p className="text-sm font-medium">
                    {azureResource.sku.name}
                    {azureResource.sku.tier && ` (${azureResource.sku.tier})`}
                  </p>
                </div>
              )}
            </div>

            {tagEntries.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                    <Tag className="h-3 w-3" />
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tagEntries.map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="text-xs text-muted-foreground">
              Last synced {formatDistanceToNow(new Date(azureResource.synced_at), { addSuffix: true })}
            </div>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            {isLoadingMetrics ? (
              <Skeleton className="h-48" />
            ) : metricNames.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No metrics available for this resource</p>
              </div>
            ) : (
              <Tabs defaultValue={metricNames[0]} className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                  {metricNames.slice(0, 6).map((name) => (
                    <TabsTrigger key={name} value={name} className="text-xs">
                      {formatMetricName(name)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {metricNames.map((metricName) => {
                  const metrics = metricsData?.[metricName] || [];
                  const chartData = [...metrics]
                    .sort((a, b) => new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime())
                    .slice(-50)
                    .map((m) => ({
                      time: new Date(m.timestamp_utc).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }),
                      value: m.average ?? m.total ?? 0,
                    }));

                  const unit = metrics[0]?.unit || '';

                  return (
                    <TabsContent key={metricName} value={metricName}>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 10 }}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => {
                              if (unit === 'Percent') return `${value.toFixed(0)}%`;
                              if (value > 1000000) return `${(value / 1000000).toFixed(1)}M`;
                              if (value > 1000) return `${(value / 1000).toFixed(1)}K`;
                              return value.toFixed(1);
                            }}
                            className="text-muted-foreground"
                          />
                          <Tooltip 
                            formatter={(value: number) => [
                              unit === 'Percent' ? `${value.toFixed(2)}%` : value.toLocaleString(),
                              formatMetricName(metricName)
                            ]}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {formatMetricName(metricName)} ({unit})
                      </p>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </TabsContent>

          {/* Cost Tab */}
          <TabsContent value="cost" className="space-y-4">
            {isLoadingCost ? (
              <Skeleton className="h-48" />
            ) : !costData || costData.totalCost === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No cost data available for this resource</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(costData.totalCost)}</p>
                    <p className="text-sm text-muted-foreground">Current month spend</p>
                  </div>
                </div>

                {costData.costTrend.length > 1 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Cost Trend (Last 30 Days)</p>
                      <ResponsiveContainer width="100%" height={150}>
                        <AreaChart data={costData.costTrend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }}
                            tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => formatCurrency(value)}
                            className="text-muted-foreground"
                          />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value), 'Cost']}
                            labelFormatter={(date) => new Date(date).toLocaleDateString()}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="cost" 
                            stroke="hsl(var(--primary))" 
                            fill="hsl(var(--primary) / 0.2)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* SQL Insights Tab */}
          {showSqlTab && (
            <TabsContent value="sql" className="space-y-6">
              <SqlPerformanceSummary 
                resourceId={azureResourceId} 
                onSync={handleSyncSqlInsights}
                isSyncing={isSyncing}
              />
              <SqlQueryInsights resourceId={azureResourceId} />
              <SqlMissingIndexList resourceId={azureResourceId} showDatabaseColumn={false} />
              <SqlWaitStats resourceId={azureResourceId} tenantId={azureResource?.azure_tenant_id} />
            </TabsContent>
          )}

          {/* Storage Tab */}
          {showSqlTab && (
            <TabsContent value="storage" className="space-y-6">
              <SqlStorageDashboard resourceId={azureResourceId} />
            </TabsContent>
          )}

          {/* Replication Tab */}
          {showSqlTab && (
            <TabsContent value="replication" className="space-y-6">
              <SqlReplicationDashboard 
                resourceId={azureResourceId} 
                tenantId={azureResource?.azure_tenant_id}
              />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
