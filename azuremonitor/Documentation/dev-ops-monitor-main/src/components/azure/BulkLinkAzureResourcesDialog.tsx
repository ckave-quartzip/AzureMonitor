import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Cloud, Server, Database, Globe, HardDrive, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { AzureResource } from '@/hooks/useAzureResources';
import { useCreateResource, ResourceInsert } from '@/hooks/useResources';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface BulkLinkAzureResourcesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  azureResources: AzureResource[];
  environmentId: string;
  clientId?: string;
  linkedResourceIds: Set<string>;
}

// Map Azure resource types to monitoring types
function mapAzureTypeToMonitoringType(azureType: string): string {
  const type = azureType.toLowerCase();
  if (type.includes('sql') || type.includes('database') || type.includes('cosmos')) return 'database';
  if (type.includes('web') || type.includes('site') || type.includes('function')) return 'website';
  if (type.includes('storage')) return 'storage';
  if (type.includes('virtual') || type.includes('compute') || type.includes('vm')) return 'server';
  if (type.includes('redis') || type.includes('cache')) return 'cache';
  return 'api';
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

type LinkStatus = 'pending' | 'linking' | 'success' | 'error';

interface LinkResult {
  resourceId: string;
  status: LinkStatus;
  error?: string;
}

export function BulkLinkAzureResourcesDialog({
  open,
  onOpenChange,
  azureResources,
  environmentId,
  clientId,
  linkedResourceIds,
}: BulkLinkAzureResourcesDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [createMonitoredResources, setCreateMonitoredResources] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [results, setResults] = useState<LinkResult[]>([]);
  const [progress, setProgress] = useState(0);
  
  const createResource = useCreateResource();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filter to only show unlinked resources
  const unlinkdResources = useMemo(() => {
    return azureResources.filter(r => !linkedResourceIds.has(r.id));
  }, [azureResources, linkedResourceIds]);

  // Filter by search
  const filteredResources = useMemo(() => {
    if (!searchQuery) return unlinkdResources;
    return unlinkdResources.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.resource_group.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [unlinkdResources, searchQuery]);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredResources.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredResources.map(r => r.id)));
    }
  };

  const handleLink = async () => {
    if (!createMonitoredResources) {
      // If not creating monitored resources, just close
      onOpenChange(false);
      toast({
        title: 'Resources tracked',
        description: `${selectedIds.size} Azure resources are now visible in the Azure Resources tab.`,
      });
      return;
    }

    setIsLinking(true);
    setResults([]);
    setProgress(0);

    const selectedResources = azureResources.filter(r => selectedIds.has(r.id));
    const newResults: LinkResult[] = selectedResources.map(r => ({
      resourceId: r.id,
      status: 'pending' as LinkStatus,
    }));
    setResults(newResults);

    let completed = 0;
    const errors: string[] = [];

    for (const azureResource of selectedResources) {
      // Update status to linking
      setResults(prev => prev.map(r => 
        r.resourceId === azureResource.id ? { ...r, status: 'linking' as LinkStatus } : r
      ));

      try {
        const resourceData: ResourceInsert = {
          name: azureResource.name,
          resource_type: mapAzureTypeToMonitoringType(azureResource.resource_type),
          description: `Azure ${formatResourceType(azureResource.resource_type)} in ${azureResource.location}`,
          environment_id: environmentId,
          client_id: clientId || null,
          azure_resource_id: azureResource.id,
          is_standalone: false,
        };

        await createResource.mutateAsync(resourceData);

        // Update status to success
        setResults(prev => prev.map(r => 
          r.resourceId === azureResource.id ? { ...r, status: 'success' as LinkStatus } : r
        ));
      } catch (error: any) {
        errors.push(azureResource.name);
        setResults(prev => prev.map(r => 
          r.resourceId === azureResource.id 
            ? { ...r, status: 'error' as LinkStatus, error: error.message } 
            : r
        ));
      }

      completed++;
      setProgress((completed / selectedResources.length) * 100);
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['resources'] });

    // Show summary toast
    if (errors.length === 0) {
      toast({
        title: 'Bulk link complete',
        description: `Successfully created ${selectedResources.length} monitored resources.`,
      });
    } else {
      toast({
        title: 'Bulk link completed with errors',
        description: `Created ${selectedResources.length - errors.length} resources. ${errors.length} failed.`,
        variant: 'destructive',
      });
    }

    setIsLinking(false);
  };

  const handleClose = () => {
    if (!isLinking) {
      setSelectedIds(new Set());
      setSearchQuery('');
      setResults([]);
      setProgress(0);
      onOpenChange(false);
    }
  };

  const getResultStatus = (resourceId: string) => {
    return results.find(r => r.resourceId === resourceId);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Bulk Link Azure Resources
          </DialogTitle>
          <DialogDescription>
            Select multiple Azure resources to link to monitoring at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Select All */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                disabled={isLinking}
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSelectAll}
              disabled={isLinking || filteredResources.length === 0}
            >
              {selectedIds.size === filteredResources.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {/* Resource List */}
          <ScrollArea className="h-[300px] border rounded-md">
            {filteredResources.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {unlinkdResources.length === 0 
                  ? 'All Azure resources are already linked'
                  : 'No resources match your search'}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredResources.map((resource) => {
                  const resultStatus = getResultStatus(resource.id);
                  
                  return (
                    <div 
                      key={resource.id}
                      className={`flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors ${
                        selectedIds.has(resource.id) ? 'bg-muted/50' : ''
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.has(resource.id)}
                        onCheckedChange={() => handleToggle(resource.id)}
                        disabled={isLinking}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getResourceIcon(resource.resource_type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{resource.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {resource.resource_group} • {resource.location}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {formatResourceType(resource.resource_type)}
                        </Badge>
                        
                        {/* Status indicator */}
                        {resultStatus && (
                          <div className="shrink-0">
                            {resultStatus.status === 'linking' && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                            {resultStatus.status === 'success' && (
                              <CheckCircle className="h-4 w-4 text-emerald-500" />
                            )}
                            {resultStatus.status === 'error' && (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Progress bar */}
          {isLinking && (
            <Progress value={progress} className="h-2" />
          )}

          {/* Options */}
          <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="create-monitored">Create monitored resources</Label>
              <p className="text-xs text-muted-foreground">
                Automatically create monitored resources for selected Azure resources
              </p>
            </div>
            <Switch
              id="create-monitored"
              checked={createMonitoredResources}
              onCheckedChange={setCreateMonitoredResources}
              disabled={isLinking}
            />
          </div>

          {/* Summary */}
          <div className="text-sm text-muted-foreground">
            {selectedIds.size} of {unlinkdResources.length} resources selected
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLinking}>
            Cancel
          </Button>
          <Button 
            onClick={handleLink} 
            disabled={selectedIds.size === 0 || isLinking}
          >
            {isLinking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              `Link ${selectedIds.size} Resources`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
