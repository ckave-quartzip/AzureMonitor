import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, Server, Database, Globe, Box, HardDrive, Container, Network, Radio, Compass, ChevronDown, Settings, ExternalLink } from 'lucide-react';
import { useResources, useCreateResource, useUpdateResource, useDeleteResource, Resource, ResourceInsert } from '@/hooks/useResources';
import { ResourceForm } from './ResourceForm';
import { MonitoringCheckList } from '@/components/monitoring/MonitoringCheckList';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface ResourceListProps {
  environmentId?: string;
  clientId?: string;
  title?: string;
}

const RESOURCE_ICONS: Record<string, typeof Server> = {
  server: Server,
  database: Database,
  website: Globe,
  api: Box,
  storage: HardDrive,
  container: Container,
  load_balancer: Network,
  cdn: Radio,
  dns: Compass,
  other: Server,
};

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-green-500/10 text-green-600 border-green-500/20',
  degraded: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  unhealthy: 'bg-destructive/10 text-destructive border-destructive/20',
  unknown: 'bg-muted text-muted-foreground',
};

export function ResourceList({ environmentId, clientId, title = 'Resources' }: ResourceListProps) {
  const { isAdmin, isEditor } = useAuth();
  const canEdit = isAdmin || isEditor;
  
  const { data: resources, isLoading } = useResources(environmentId, clientId);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

  const toggleExpanded = (resourceId: string) => {
    setExpandedResources(prev => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  };

  const handleCreate = (data: { name: string; resource_type: string; description?: string }) => {
    const payload: ResourceInsert = {
      ...data,
      environment_id: environmentId || null,
      client_id: clientId || null,
    };
    createResource.mutate(payload, { onSuccess: () => setIsCreateOpen(false) });
  };

  const handleUpdate = (data: { name: string; resource_type: string; description?: string }) => {
    if (!editingResource) return;
    updateResource.mutate(
      { id: editingResource.id, ...data },
      { onSuccess: () => setEditingResource(null) }
    );
  };

  const handleDelete = (resource: Resource) => {
    deleteResource.mutate(resource.id);
  };

  const getResourceIcon = (type: string) => {
    const Icon = RESOURCE_ICONS[type] || Server;
    return <Icon className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">{title}</CardTitle>
        {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Resource</DialogTitle>
              </DialogHeader>
              <ResourceForm
                onSubmit={handleCreate}
                onCancel={() => setIsCreateOpen(false)}
                isLoading={createResource.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {resources?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p>No resources yet</p>
            {canEdit && <p className="text-sm">Add resources to start monitoring</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {resources?.map((resource) => (
              <Collapsible 
                key={resource.id} 
                open={expandedResources.has(resource.id)}
                onOpenChange={() => toggleExpanded(resource.id)}
              >
                <div className="rounded-lg border bg-card">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        {getResourceIcon(resource.resource_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link 
                            to={`/resources/${resource.id}`}
                            className="font-medium hover:text-primary hover:underline transition-colors"
                          >
                            {resource.name}
                          </Link>
                          <Badge variant="outline" className={STATUS_COLORS[resource.status] || STATUS_COLORS.unknown}>
                            {resource.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="capitalize">{resource.resource_type.replace('_', ' ')}</span>
                          {resource.description && (
                            <>
                              <span>•</span>
                              <span>{resource.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                          <span className="sr-only">Configure monitoring</span>
                        </Button>
                      </CollapsibleTrigger>
                      
                      {canEdit && (
                        <>
                          <Dialog open={editingResource?.id === resource.id} onOpenChange={(open) => !open && setEditingResource(null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setEditingResource(resource)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Resource</DialogTitle>
                              </DialogHeader>
                              <ResourceForm
                                resource={editingResource || undefined}
                                onSubmit={handleUpdate}
                                onCancel={() => setEditingResource(null)}
                                isLoading={updateResource.isPending}
                              />
                            </DialogContent>
                          </Dialog>
                          
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{resource.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(resource)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <CollapsibleContent>
                    <div className="border-t p-4">
                      <MonitoringCheckList resourceId={resource.id} resourceName={resource.name} />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
