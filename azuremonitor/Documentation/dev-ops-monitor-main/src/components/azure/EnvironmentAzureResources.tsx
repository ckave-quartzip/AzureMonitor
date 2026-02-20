import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cloud, Server, Database, Globe, HardDrive, Link2, Search, Filter, Check, Layers } from 'lucide-react';
import { useAzureResourcesByEnvironment, AzureResource } from '@/hooks/useAzureResources';
import { useResources } from '@/hooks/useResources';
import { LinkAzureResourceDialog } from './LinkAzureResourceDialog';
import { BulkLinkAzureResourcesDialog } from './BulkLinkAzureResourcesDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface EnvironmentAzureResourcesProps {
  environmentId: string;
}

// Map resource types to icons
function getResourceIcon(resourceType: string) {
  const type = resourceType.toLowerCase();
  if (type.includes('sql') || type.includes('database')) return <Database className="h-4 w-4" />;
  if (type.includes('web') || type.includes('site')) return <Globe className="h-4 w-4" />;
  if (type.includes('storage')) return <HardDrive className="h-4 w-4" />;
  if (type.includes('virtual') || type.includes('compute')) return <Server className="h-4 w-4" />;
  return <Cloud className="h-4 w-4" />;
}

// Format resource type for display
function formatResourceType(resourceType: string): string {
  const parts = resourceType.split('/');
  return parts[parts.length - 1] || resourceType;
}

export function EnvironmentAzureResources({ environmentId }: EnvironmentAzureResourcesProps) {
  const { data: resources, isLoading, error } = useAzureResourcesByEnvironment(environmentId);
  const { data: monitoredResources } = useResources(environmentId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [linkingResource, setLinkingResource] = useState<AzureResource | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  // Get unique resource types for filter dropdown
  const resourceTypes = useMemo(() => {
    if (!resources) return [];
    const types = new Set(resources.map(r => formatResourceType(r.resource_type)));
    return Array.from(types).sort();
  }, [resources]);

  // Check which Azure resources are already linked
  const linkedAzureResourceIds = useMemo(() => {
    if (!monitoredResources) return new Set<string>();
    return new Set(monitoredResources.filter(r => r.azure_resource_id).map(r => r.azure_resource_id!));
  }, [monitoredResources]);

  // Filter resources based on search and type
  const filteredResources = useMemo(() => {
    if (!resources) return [];
    
    return resources.filter(resource => {
      const matchesSearch = !searchQuery || 
        resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resource.resource_group.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || 
        formatResourceType(resource.resource_type) === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [resources, searchQuery, typeFilter]);

  // Group by resource type for summary
  const byType: Record<string, AzureResource[]> = useMemo(() => {
    const grouped: Record<string, AzureResource[]> = {};
    filteredResources.forEach((r) => {
      const type = formatResourceType(r.resource_type);
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(r);
    });
    return grouped;
  }, [filteredResources]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Failed to load Azure resources
        </CardContent>
      </Card>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Azure Resources
          </CardTitle>
          <CardDescription>
            No Azure resources linked to this environment
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Cloud className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Configure Azure settings for this environment to see linked resources.</p>
        </CardContent>
      </Card>
    );
  }

  // Count unlinked resources
  const unlinkedCount = resources.length - linkedAzureResourceIds.size;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Azure Resources
              </CardTitle>
              <CardDescription>
                {filteredResources.length} of {resources.length} resources shown
              </CardDescription>
            </div>
            {unlinkedCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowBulkDialog(true)}>
                <Layers className="h-4 w-4 mr-2" />
                Bulk Link ({unlinkedCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or resource group..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {resourceTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resource Table */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Resource Group</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResources.map((resource) => {
                  const isLinked = linkedAzureResourceIds.has(resource.id);
                  
                  return (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getResourceIcon(resource.resource_type)}
                          <span className="font-medium">{resource.name}</span>
                          {isLinked && (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" />
                              Linked
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatResourceType(resource.resource_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {resource.resource_group}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {resource.location}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isLinked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLinkingResource(resource)}
                          >
                            <Link2 className="h-4 w-4 mr-1" />
                            Link
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Summary by Type */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(byType).map(([type, items]) => (
              <Badge key={type} variant="secondary">
                {type}: {items.length}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Link Dialog */}
      {linkingResource && (
        <LinkAzureResourceDialog
          open={!!linkingResource}
          onOpenChange={(open) => !open && setLinkingResource(null)}
          azureResource={linkingResource}
          environmentId={environmentId}
        />
      )}

      {/* Bulk Link Dialog */}
      <BulkLinkAzureResourcesDialog
        open={showBulkDialog}
        onOpenChange={setShowBulkDialog}
        azureResources={resources}
        environmentId={environmentId}
        linkedResourceIds={linkedAzureResourceIds}
      />
    </>
  );
}
