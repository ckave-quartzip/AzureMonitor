import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Globe, Server, Database, HardDrive, Cloud, Network, Shield, 
  Activity, ExternalLink, RefreshCw, BellOff, CheckCircle2, 
  AlertTriangle, XCircle, HelpCircle, Filter
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useAllResourcesWithDetails, useClients, useEnvironmentsList, ResourceWithDetails } from '@/hooks/useAllResourcesWithDetails';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const RESOURCE_ICONS: Record<string, React.ElementType> = {
  website: Globe,
  server: Server,
  database: Database,
  storage: HardDrive,
  'cloud-service': Cloud,
  network: Network,
  security: Shield,
  application: Activity,
};

const STATUS_CONFIG = {
  up: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Healthy' },
  degraded: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Degraded' },
  down: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Down' },
  unknown: { icon: HelpCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Unknown' },
};

const ITEMS_PER_PAGE = 25;

export default function Resources() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientFilter, setClientFilter] = useState(searchParams.get('client') || '');
  const [environmentFilter, setEnvironmentFilter] = useState(searchParams.get('environment') || '');
  const [currentPage, setCurrentPage] = useState(1);
  
  const queryClient = useQueryClient();
  
  const { data: resources, isLoading, refetch } = useAllResourcesWithDetails({
    clientId: clientFilter || undefined,
    environmentId: environmentFilter || undefined,
  });
  
  const { data: clients } = useClients();
  const { data: environments } = useEnvironmentsList(clientFilter || undefined);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (clientFilter) params.set('client', clientFilter);
    if (environmentFilter) params.set('environment', environmentFilter);
    setSearchParams(params, { replace: true });
    setCurrentPage(1);
  }, [clientFilter, environmentFilter, setSearchParams]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('resources-page-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'resources' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-resources-with-details'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Calculate status summary
  const statusSummary = useMemo(() => {
    if (!resources) return { down: 0, degraded: 0, unknown: 0, up: 0 };
    return resources.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { down: 0, degraded: 0, unknown: 0, up: 0 } as Record<string, number>
    );
  }, [resources]);

  // Pagination
  const paginatedResources = useMemo(() => {
    if (!resources) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return resources.slice(start, start + ITEMS_PER_PAGE);
  }, [resources, currentPage]);

  const totalPages = Math.ceil((resources?.length || 0) / ITEMS_PER_PAGE);

  const handleClearFilters = () => {
    setClientFilter('');
    setEnvironmentFilter('');
  };

  const handleAcknowledge = async (resourceId: string) => {
    try {
      // Acknowledge all unresolved alerts for this resource
      const { error } = await supabase
        .from('alerts')
        .update({ 
          acknowledged_at: new Date().toISOString(),
        })
        .eq('resource_id', resourceId)
        .is('resolved_at', null)
        .is('acknowledged_at', null);

      if (error) throw error;
      toast.success('Alerts acknowledged');
      refetch();
    } catch (error) {
      toast.error('Failed to acknowledge alerts');
    }
  };

  const getResourceIcon = (type: string) => {
    const IconComponent = RESOURCE_ICONS[type] || Activity;
    return <IconComponent className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">All Resources</h1>
            {resources && (
              <Badge variant="secondary" className="text-sm">
                {resources.length} total
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Status Summary */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statusSummary.down > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              <XCircle className="h-3.5 w-3.5 mr-1" />
              {statusSummary.down} Down
            </Badge>
          )}
          {statusSummary.degraded > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30 text-sm px-3 py-1">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              {statusSummary.degraded} Degraded
            </Badge>
          )}
          {statusSummary.unknown > 0 && (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              {statusSummary.unknown} Unknown
            </Badge>
          )}
          {statusSummary.up > 0 && (
            <Badge className="bg-green-500/20 text-green-600 hover:bg-green-500/30 text-sm px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {statusSummary.up} Healthy
            </Badge>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Filters</CardTitle>
              </div>
              {(clientFilter || environmentFilter) && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-4">
              <div className="w-full sm:w-64">
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Client
                </label>
                <Select value={clientFilter} onValueChange={(v) => {
                  setClientFilter(v === 'all' ? '' : v);
                  setEnvironmentFilter('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-64">
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Environment
                </label>
                <Select value={environmentFilter} onValueChange={(v) => setEnvironmentFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All environments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All environments</SelectItem>
                    {environments?.map((env) => (
                      <SelectItem key={env.id} value={env.id}>
                        {env.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : resources && resources.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead className="hidden md:table-cell">Type</TableHead>
                      <TableHead className="hidden lg:table-cell">Client</TableHead>
                      <TableHead className="hidden lg:table-cell">Environment</TableHead>
                      <TableHead className="hidden sm:table-cell">Monitoring</TableHead>
                      <TableHead className="hidden md:table-cell">Last Checked</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedResources.map((resource) => (
                      <ResourceRow 
                        key={resource.id} 
                        resource={resource} 
                        getResourceIcon={getResourceIcon}
                        onAcknowledge={handleAcknowledge}
                      />
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                      {Math.min(currentPage * ITEMS_PER_PAGE, resources.length)} of{' '}
                      {resources.length} resources
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNum)}
                                isActive={currentPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">No resources found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {clientFilter || environmentFilter
                    ? 'No resources match your current filters.'
                    : 'Get started by adding resources to your clients.'}
                </p>
                {(clientFilter || environmentFilter) && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface ResourceRowProps {
  resource: ResourceWithDetails;
  getResourceIcon: (type: string) => React.ReactNode;
  onAcknowledge: (resourceId: string) => void;
}

function ResourceRow({ resource, getResourceIcon, onAcknowledge }: ResourceRowProps) {
  const statusConfig = STATUS_CONFIG[resource.status];
  const StatusIcon = statusConfig.icon;

  return (
    <TableRow>
      <TableCell>
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${statusConfig.bg}`}>
          <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
          <span className={`text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Link 
          to={`/resources/${resource.id}`}
          className="font-medium hover:underline"
        >
          {resource.name}
        </Link>
        {resource.description && (
          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
            {resource.description}
          </p>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center gap-2">
          {getResourceIcon(resource.resource_type)}
          <span className="capitalize text-sm">{resource.resource_type}</span>
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {resource.client_name ? (
          <Link 
            to={`/clients/${resource.client_id}`}
            className="text-sm hover:underline"
          >
            {resource.client_name}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {resource.environment_name ? (
          <span className="text-sm">{resource.environment_name}</span>
        ) : resource.is_standalone ? (
          <Badge variant="outline" className="text-xs">Standalone</Badge>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {resource.monitoring_check_count > 0 ? (
          <Badge variant="secondary" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            {resource.monitoring_check_count} active
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {resource.last_checked_at ? (
          <span className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(resource.last_checked_at), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">Never</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {resource.active_alert_count > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onAcknowledge(resource.id)}
              title="Acknowledge alerts"
            >
              <BellOff className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/resources/${resource.id}`} title="View details">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
