import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Cloud,
  ExternalLink,
  MapPin,
  Folder,
  Tag,
  DollarSign,
  Activity,
  Server,
  Database,
  Globe,
  HardDrive,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useResourceAzureDetails, useResourceAzureMetrics } from '@/hooks/useResourceAzureDetails';
import { useAzureResourceCostHistory } from '@/hooks/useAzureResourceCostHistory';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { SqlPerformanceSummary } from '@/components/azure/SqlPerformanceSummary';
import { SqlQueryInsights } from '@/components/azure/SqlQueryInsights';
import { SqlMissingIndexList } from '@/components/azure/SqlMissingIndexList';
import { SqlWaitStats } from '@/components/azure/SqlWaitStats';
import { SqlStorageDashboard } from '@/components/azure/SqlStorageDashboard';
import { SqlReplicationDashboard } from '@/components/azure/SqlReplicationDashboard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function AzureResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: azureResource, isLoading: isLoadingResource } = useResourceAzureDetails(id);
  const { data: costHistory, isLoading: isLoadingCost } = useAzureResourceCostHistory(id);
  const { data: metricsData, isLoading: isLoadingMetrics } = useResourceAzureMetrics(id);
  const [isSyncing, setIsSyncing] = useState(false);
  const [costDays, setCostDays] = useState(30);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: costHistory?.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoadingResource) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!azureResource) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Resource Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The Azure resource you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/azure">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Azure Overview
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const ResourceIcon = getResourceIcon(azureResource.resource_type);
  const metricNames = Object.keys(metricsData || {});
  const tags = azureResource.tags || {};
  const tagEntries = Object.entries(tags);
  const showSqlTab = isSqlResource(azureResource.resource_type);

  // Calculate cost change
  const costTrend = costHistory?.dailyCosts || [];
  const midPoint = Math.floor(costTrend.length / 2);
  const firstHalfCost = costTrend.slice(0, midPoint).reduce((sum, d) => sum + d.cost, 0);
  const secondHalfCost = costTrend.slice(midPoint).reduce((sum, d) => sum + d.cost, 0);
  const costChange = firstHalfCost > 0 ? ((secondHalfCost - firstHalfCost) / firstHalfCost) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/azure">Azure</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/azure">Resources</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{azureResource.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <ResourceIcon className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                {azureResource.name}
                <Badge variant="secondary" className="gap-1">
                  {formatResourceType(azureResource.resource_type)}
                </Badge>
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {azureResource.location}
                </span>
                <span className="flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {azureResource.resource_group}
                </span>
              </div>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a
              href={buildAzurePortalUrl(azureResource.azure_resource_id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Azure Portal
            </a>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(costHistory?.totalCost || 0)}</div>
              <p className="text-xs flex items-center gap-1 mt-1">
                {costChange >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-destructive" />
                    <span className="text-destructive">+{costChange.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-green-500" />
                    <span className="text-green-500">{costChange.toFixed(1)}%</span>
                  </>
                )}
                <span className="text-muted-foreground">vs previous period</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Metrics Tracked</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricNames.length}</div>
              <p className="text-xs text-muted-foreground">
                Active metrics being monitored
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDistanceToNow(new Date(azureResource.synced_at), { addSuffix: true })}
              </div>
              <p className="text-xs text-muted-foreground">
                Data last refreshed from Azure
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cost" className="space-y-6">
          <TabsList className={showSqlTab ? 'grid-cols-5' : 'grid-cols-3'}>
            <TabsTrigger value="cost" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Analysis
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Properties
            </TabsTrigger>
            {showSqlTab && (
              <>
                <TabsTrigger value="sql" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  SQL Insights
                </TabsTrigger>
                <TabsTrigger value="storage" className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Storage
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Cost Tab */}
          <TabsContent value="cost" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cost Trend Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Cost History</CardTitle>
                      <CardDescription>Daily costs over the last {costDays} days</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      {[30, 60, 90].map((days) => (
                        <Button
                          key={days}
                          variant={costDays === days ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCostDays(days)}
                        >
                          {days}d
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingCost ? (
                    <Skeleton className="h-64" />
                  ) : costTrend.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No cost data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={costTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(date) =>
                            new Date(date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          }
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
                  )}
                </CardContent>
              </Card>

              {/* Cost by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                  <CardDescription>By meter category</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingCost ? (
                    <Skeleton className="h-64" />
                  ) : (costHistory?.costByCategory || []).length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No category data
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={costHistory?.costByCategory.slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="cost"
                            nameKey="category"
                          >
                            {costHistory?.costByCategory.slice(0, 5).map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-4">
                        {costHistory?.costByCategory.slice(0, 5).map((item, index) => (
                          <div key={item.category} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="truncate max-w-[120px]">{item.category}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(item.cost)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-6">
            {isLoadingMetrics ? (
              <Skeleton className="h-64" />
            ) : metricNames.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No metrics available for this resource</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {metricNames.slice(0, 6).map((metricName) => {
                  const metrics = metricsData?.[metricName] || [];
                  const chartData = [...metrics]
                    .sort(
                      (a, b) =>
                        new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
                    )
                    .slice(-50)
                    .map((m) => ({
                      time: new Date(m.timestamp_utc).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                      value: m.average ?? m.total ?? 0,
                    }));

                  const unit = metrics[0]?.unit || '';
                  const latestValue = chartData[chartData.length - 1]?.value || 0;

                  return (
                    <Card key={metricName}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{formatMetricName(metricName)}</CardTitle>
                          <Badge variant="outline">
                            {unit === 'Percent' ? `${latestValue.toFixed(1)}%` : latestValue.toLocaleString()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
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
                                formatMetricName(metricName),
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resource Properties</CardTitle>
                <CardDescription>Configuration and metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
                        <Tag className="h-3 w-3" />
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {tagEntries.map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div className="text-xs text-muted-foreground">
                  Last synced {formatDistanceToNow(new Date(azureResource.synced_at), { addSuffix: true })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SQL Insights Tab */}
          {showSqlTab && (
            <TabsContent value="sql" className="space-y-6">
              <SqlPerformanceSummary
                resourceId={id!}
                onSync={handleSyncSqlInsights}
                isSyncing={isSyncing}
              />
              <SqlQueryInsights resourceId={id!} />
              <SqlMissingIndexList resourceId={id!} showDatabaseColumn={false} />
              <SqlWaitStats resourceId={id!} tenantId={azureResource?.azure_tenant_id} />
            </TabsContent>
          )}

          {/* Storage Tab */}
          {showSqlTab && (
            <TabsContent value="storage" className="space-y-6">
              <SqlStorageDashboard resourceId={id!} />
              <SqlReplicationDashboard resourceId={id!} tenantId={azureResource?.azure_tenant_id} />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}
