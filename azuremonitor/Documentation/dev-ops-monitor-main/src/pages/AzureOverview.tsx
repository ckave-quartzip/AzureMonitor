import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Cloud,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Settings,
  Clock,
  Database,
  Globe,
  HardDrive,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { useAzureOverviewStats, ResourceTypeStats } from '@/hooks/useAzureOverviewStats';
import { useAzureTenants } from '@/hooks/useAzureTenants';
import { CostTrendChart } from '@/components/azure/CostTrendChart';
import { CostByResourceChart } from '@/components/azure/CostByResourceChart';
import { AzureSyncLogList } from '@/components/azure/AzureSyncLogList';
import { SqlOverviewDashboard } from '@/components/azure/SqlOverviewDashboard';
import { AzureResourceTypeList } from '@/components/azure/AzureResourceTypeList';
import { TopSpendingResources } from '@/components/azure/TopSpendingResources';
import { CostByCategoryWidget } from '@/components/azure/CostByCategoryWidget';
import { CostByResourceGroupWidget } from '@/components/azure/CostByResourceGroupWidget';
import { CostAnomalyWidget } from '@/components/azure/CostAnomalyWidget';
import { IdleResourcesWidget } from '@/components/azure/IdleResourcesWidget';
import { OptimizationScoreWidget } from '@/components/azure/OptimizationScoreWidget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Map resource types to icons
function getResourceTypeIcon(type: string) {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('sql') || lowerType.includes('database')) return Database;
  if (lowerType.includes('web') || lowerType.includes('site')) return Globe;
  if (lowerType.includes('storage')) return HardDrive;
  if (lowerType.includes('virtual') || lowerType.includes('compute')) return Server;
  return Cloud;
}

export default function AzureOverview() {
  const { data: tenants, isLoading: tenantsLoading } = useAzureTenants();
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<{ key: string; data: ResourceTypeStats } | null>(null);
  
  // Pass selected tenant IDs to the stats hook
  const tenantIdsForQuery = selectedTenantIds.length > 0 ? selectedTenantIds : undefined;
  const { data: stats, isLoading: statsLoading } = useAzureOverviewStats(tenantIdsForQuery);
  
  // Filter displayed tenants based on selection
  const filteredTenants = useMemo(() => {
    if (!tenants) return [];
    if (selectedTenantIds.length === 0) return tenants;
    return tenants.filter(t => selectedTenantIds.includes(t.id));
  }, [tenants, selectedTenantIds]);

  const toggleTenant = (tenantId: string) => {
    setSelectedTenantIds(prev => 
      prev.includes(tenantId) 
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const clearFilters = () => {
    setSelectedTenantIds([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSyncAll = async () => {
    setSyncing('all');
    try {
      for (const tenant of tenants || []) {
        if (tenant.is_enabled) {
          await supabase.functions.invoke('azure-sync-resources', {
            body: { tenantId: tenant.id },
          });
        }
      }
      toast({
        title: 'Sync initiated',
        description: 'Azure resources sync has been started for all tenants.',
      });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Failed to initiate Azure sync.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const handleSyncTenant = async (tenantId: string) => {
    setSyncing(tenantId);
    try {
      await supabase.functions.invoke('azure-sync-resources', {
        body: { tenantId },
      });
      toast({
        title: 'Sync initiated',
        description: 'Azure resources sync has been started.',
      });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Failed to initiate Azure sync.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const formatTypeLabel = (type: string) => {
    return type.replace(/([A-Z])/g, ' $1').trim();
  };

  const isLoading = statsLoading || tenantsLoading;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Cloud className="h-8 w-8 text-primary" />
              Azure Overview
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive view of all Azure tenants, resources, and costs
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Tenant Filter Dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {selectedTenantIds.length === 0 
                    ? 'All Tenants' 
                    : `${selectedTenantIds.length} Tenant${selectedTenantIds.length > 1 ? 's' : ''}`
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Filter by Tenant</span>
                    {selectedTenantIds.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-6 px-2 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <div className="p-2 max-h-64 overflow-auto">
                  {tenantsLoading ? (
                    <div className="space-y-2 p-2">
                      {[1, 2].map(i => <Skeleton key={i} className="h-6 w-full" />)}
                    </div>
                  ) : tenants && tenants.length > 0 ? (
                    <div className="space-y-1">
                      {tenants.map(tenant => (
                        <label
                          key={tenant.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedTenantIds.includes(tenant.id)}
                            onCheckedChange={() => toggleTenant(tenant.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {tenant.is_enabled ? 'Enabled' : 'Disabled'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground p-2">No tenants configured</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button asChild variant="outline">
              <Link to="/azure/costs">
                <DollarSign className="h-4 w-4 mr-2" />
                Cost Report
              </Link>
            </Button>
            <Button
              onClick={handleSyncAll}
              disabled={syncing !== null}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing === 'all' ? 'animate-spin' : ''}`} />
              Sync All
            </Button>
            <Button asChild>
              <Link to="/admin">
                <Settings className="h-4 w-4 mr-2" />
                Manage Tenants
              </Link>
            </Button>
          </div>
        </div>

        {/* Active Filter Indicator */}
        {selectedTenantIds.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtering by:</span>
            {tenants?.filter(t => selectedTenantIds.includes(t.id)).map(tenant => (
              <Badge key={tenant.id} variant="secondary" className="gap-1">
                {tenant.name}
                <button
                  onClick={() => toggleTenant(tenant.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
              Clear all
            </Button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Azure Tenants</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats?.enabledTenants || 0} enabled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalResources || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {Object.keys(stats?.resourcesByType || {}).length} types
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">30-Day Spend</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.monthlySpend || 0)}</div>
                  <p className="text-xs flex items-center gap-1">
                    {(stats?.spendChange || 0) >= 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-destructive" />
                        <span className="text-destructive">+{stats?.spendChange.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-green-500" />
                        <span className="text-green-500">{stats?.spendChange.toFixed(1)}%</span>
                      </>
                    )}
                    <span className="text-muted-foreground">vs prior 30 days</span>
                  </p>
                  {stats?.costPeriodStart && stats?.costPeriodEnd && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(stats.costPeriodStart), 'MMM d')} - {format(parseISO(stats.costPeriodEnd), 'MMM d, yyyy')}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Health Status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-lg font-bold">{stats?.healthyResources || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-lg font-bold">{stats?.warningResources || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-lg font-bold">{stats?.criticalResources || 0}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Resources with metric alerts
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Cost Insight Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <TopSpendingResources tenantIds={tenantIdsForQuery} />
          <CostByCategoryWidget tenantIds={tenantIdsForQuery} />
          <CostByResourceGroupWidget tenantIds={tenantIdsForQuery} />
        </div>

        {/* AI-Powered Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <CostAnomalyWidget tenantIds={tenantIdsForQuery} />
          <IdleResourcesWidget tenantIds={tenantIdsForQuery} />
          <OptimizationScoreWidget tenantIds={tenantIdsForQuery} />
        </div>

        {/* Tenants Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Tenants Overview</CardTitle>
            <CardDescription>
              {selectedTenantIds.length > 0 
                ? `Showing ${selectedTenantIds.length} selected tenant${selectedTenantIds.length > 1 ? 's' : ''}`
                : 'All configured Azure tenants and their status'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tenantsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTenants && filteredTenants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Subscription ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {tenant.subscription_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {tenant.is_enabled ? (
                          <Badge variant="default" className="bg-green-500">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.last_sync_at ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(tenant.last_sync_at), { addSuffix: true })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncTenant(tenant.id)}
                          disabled={syncing !== null || !tenant.is_enabled}
                        >
                          <RefreshCw className={`h-4 w-4 ${syncing === tenant.id ? 'animate-spin' : ''}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No Azure tenants configured</p>
                <Button asChild className="mt-4">
                  <Link to="/admin">Configure Tenants</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="costs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="costs" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Analysis
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Resource Breakdown
            </TabsTrigger>
            <TabsTrigger value="sql" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              SQL Performance
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Sync Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="costs">
            <div className="space-y-6">
              {filteredTenants && filteredTenants.length > 0 ? (
                <>
                  {/* Aggregated view for selected tenants */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Cost Trend {selectedTenantIds.length > 0 ? '(Selected Tenants)' : '(All Tenants)'}
                        </CardTitle>
                        <CardDescription>Daily costs over the last 30 days</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CostTrendChart tenantIds={tenantIdsForQuery} />
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Cost by Resource {selectedTenantIds.length > 0 ? '(Selected Tenants)' : '(All Tenants)'}
                        </CardTitle>
                        <CardDescription>Top resources by cost</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <CostByResourceChart tenantIds={tenantIdsForQuery} />
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Per-tenant breakdown if multiple tenants selected or showing all */}
                  {filteredTenants.length > 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Per-Tenant Breakdown</h3>
                      {filteredTenants.filter(t => t.is_enabled).map((tenant) => (
                        <Card key={tenant.id}>
                          <CardHeader>
                            <CardTitle className="text-base">{tenant.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <CostTrendChart tenantId={tenant.id} />
                              <CostByResourceChart tenantId={tenant.id} />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Card className="col-span-2">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Configure an Azure tenant to view cost data
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="resources">
            {selectedType ? (
              <AzureResourceTypeList
                resourceType={selectedType.data.fullType}
                displayName={formatTypeLabel(selectedType.key)}
                onBack={() => setSelectedType(null)}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Resources by Type</CardTitle>
                  <CardDescription>Click on a resource type to see all resources and their costs</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats && Object.keys(stats.resourcesByType).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Object.entries(stats.resourcesByType)
                        .sort(([, a], [, b]) => b.cost - a.cost || b.count - a.count)
                        .map(([type, data]) => {
                          const IconComponent = getResourceTypeIcon(type);
                          return (
                            <div
                              key={type}
                              className="flex items-center gap-3 p-4 rounded-lg border bg-card cursor-pointer hover:border-primary hover:shadow-sm transition-all"
                              onClick={() => setSelectedType({ key: type, data })}
                            >
                              <div className="p-2 rounded-lg bg-primary/10">
                                <IconComponent className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {formatTypeLabel(type)}
                                </p>
                                <p className="text-2xl font-bold">{data.count}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatCurrency(data.cost)}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No resources synced yet
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sql">
            <SqlOverviewDashboard />
          </TabsContent>

          <TabsContent value="activity">
            <AzureSyncLogList tenantIds={tenantIdsForQuery} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
