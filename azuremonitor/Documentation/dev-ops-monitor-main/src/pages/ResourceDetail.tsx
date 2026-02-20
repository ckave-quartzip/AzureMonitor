import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Globe, Server, Database, Shield, Edit, ExternalLink, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useResourceMetrics } from '@/hooks/useResourceMetrics';
import { useResourceAzureDetails } from '@/hooks/useResourceAzureDetails';
import { ResourceStatusHero } from '@/components/resources/ResourceStatusHero';
import { UptimeStatsGrid } from '@/components/resources/UptimeStatsGrid';
import { ResourceResponseTimeChart } from '@/components/resources/ResourceResponseTimeChart';
import { MonitoringCheckList } from '@/components/monitoring/MonitoringCheckList';
import { ResourceAzurePanel } from '@/components/resources/ResourceAzurePanel';
import { ResourceAzureHero } from '@/components/resources/ResourceAzureHero';
import { AzureMetricsChart } from '@/components/resources/AzureMetricsChart';
import { CostTrendWidget } from '@/components/resources/CostTrendWidget';
import { formatDistanceToNow } from 'date-fns';

const RESOURCE_TYPE_ICONS: Record<string, typeof Globe> = {
  website: Globe,
  server: Server,
  database: Database,
  api: Shield,
};

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: metrics, isLoading } = useResourceMetrics(id);
  
  // Fetch Azure details if resource has azure_resource_id
  const azureResourceId = metrics?.resource?.azure_resource_id;
  const { data: azureDetails } = useResourceAzureDetails(azureResourceId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!metrics?.resource) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Resource Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The resource you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to="/">Go to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { resource } = metrics;
  const ResourceIcon = RESOURCE_TYPE_ICONS[resource.resource_type] || Globe;
  const clientName = (resource as any).clients?.name;
  const environmentName = (resource as any).environments?.name;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            {clientName && (
              <>
                <span>/</span>
                <Link to="/clients" className="hover:text-foreground transition-colors">
                  Clients
                </Link>
                <span>/</span>
                <span>{clientName}</span>
              </>
            )}
            {environmentName && (
              <>
                <span>/</span>
                <span>{environmentName}</span>
              </>
            )}
            <span>/</span>
            <span className="text-foreground">{resource.name}</span>
          </div>

          {/* Resource Title */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to={resource.client_id ? `/clients/${resource.client_id}` : '/'}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <ResourceIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{resource.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize">
                      {resource.resource_type}
                    </Badge>
                    {resource.azure_resource_id && (
                      <Badge variant="secondary" className="gap-1">
                        <Cloud className="h-3 w-3" />
                        Azure Linked
                      </Badge>
                    )}
                    {resource.description && (
                      <span className="text-sm text-muted-foreground">
                        {resource.description}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Resource
            </Button>
          </div>
        </div>

        {/* Status Hero */}
        <ResourceStatusHero
          status={metrics.currentStatus as 'up' | 'down' | 'degraded' | 'unknown'}
          statusDuration={metrics.statusDuration}
          lastCheckedAt={metrics.lastCheckedAt}
          checkInterval={metrics.checkInterval}
          hourlyData={metrics.hourlyData}
          uptime24h={metrics.uptime24h.percentage}
        />

        {/* Azure Hero Cards - Prominent Azure Stats */}
        {resource.azure_resource_id && (
          <div className="mt-6">
            <ResourceAzureHero 
              azureResourceId={resource.azure_resource_id} 
              resourceType={azureDetails?.resource_type}
            />
          </div>
        )}

        {/* Azure Metrics Chart - Full Width */}
        {resource.azure_resource_id && (
          <div className="mt-6">
            <AzureMetricsChart 
              azureResourceId={resource.azure_resource_id}
              resourceType={azureDetails?.resource_type}
            />
          </div>
        )}

        {/* Side by Side: Cost Trend & Response Time */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {resource.azure_resource_id && (
            <CostTrendWidget azureResourceId={resource.azure_resource_id} />
          )}
          <ResourceResponseTimeChart resourceId={id!} />
        </div>

        <Separator className="my-6" />

        {/* Uptime Stats */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Uptime Statistics</h2>
          <UptimeStatsGrid
            uptime7d={metrics.uptime7d}
            uptime30d={metrics.uptime30d}
            uptime365d={metrics.uptime365d}
          />
        </div>

        {/* Tabbed Section for Details */}
        <Tabs defaultValue="monitoring" className="mb-6">
          <TabsList>
            <TabsTrigger value="monitoring">Monitoring Checks</TabsTrigger>
            {resource.azure_resource_id && (
              <TabsTrigger value="azure">Azure Details</TabsTrigger>
            )}
            {metrics.recentAlerts.length > 0 && (
              <TabsTrigger value="alerts">Alerts ({metrics.recentAlerts.length})</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="monitoring" className="mt-4">
            <MonitoringCheckList 
              resourceId={id!} 
              azureResourceId={resource.azure_resource_id}
              azureResourceType={azureDetails?.resource_type}
            />
          </TabsContent>

          {resource.azure_resource_id && (
            <TabsContent value="azure" className="mt-4">
              <ResourceAzurePanel azureResourceId={resource.azure_resource_id} />
            </TabsContent>
          )}

          {metrics.recentAlerts.length > 0 && (
            <TabsContent value="alerts" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.recentAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              alert.severity === 'critical'
                                ? 'destructive'
                                : alert.severity === 'warning'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {alert.severity}
                          </Badge>
                          <span className="text-sm">{alert.message}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {alert.resolved_at ? (
                            <Badge variant="outline" className="text-emerald-500">
                              Resolved
                            </Badge>
                          ) : alert.acknowledged_at ? (
                            <Badge variant="outline">Acknowledged</Badge>
                          ) : (
                            <Badge variant="destructive">Active</Badge>
                          )}
                          <span>{formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
