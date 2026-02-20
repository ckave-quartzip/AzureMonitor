import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Layers, ChevronDown, ChevronRight, Cloud, Server, DollarSign } from 'lucide-react';
import { useEnvironments, useCreateEnvironment, useUpdateEnvironment, useDeleteEnvironment, Environment } from '@/hooks/useEnvironments';
import { EnvironmentForm, EnvironmentFormSubmitData } from './EnvironmentForm';
import { ResourceList } from '@/components/resources/ResourceList';
import { EnvironmentAzureResources } from '@/components/azure/EnvironmentAzureResources';
import { EnvironmentCostOverview } from '@/components/azure/EnvironmentCostOverview';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface EnvironmentListProps {
  clientId: string;
}

export function EnvironmentList({ clientId }: EnvironmentListProps) {
  const { isAdmin, isEditor } = useAuth();
  const canEdit = isAdmin || isEditor;
  
  const { data: environments, isLoading } = useEnvironments(clientId);
  const createEnvironment = useCreateEnvironment();
  const updateEnvironment = useUpdateEnvironment();
  const deleteEnvironment = useDeleteEnvironment();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [expandedEnvironments, setExpandedEnvironments] = useState<Set<string>>(new Set());

  const toggleExpanded = (envId: string) => {
    setExpandedEnvironments(prev => {
      const next = new Set(prev);
      if (next.has(envId)) {
        next.delete(envId);
      } else {
        next.add(envId);
      }
      return next;
    });
  };

  const handleCreate = (data: EnvironmentFormSubmitData) => {
    createEnvironment.mutate(
      { 
        ...data, 
        client_id: clientId,
        description: data.description || null,
        azure_tag_filter: data.azure_tag_filter || null,
      },
      { onSuccess: () => setIsCreateOpen(false) }
    );
  };

  const handleUpdate = (data: EnvironmentFormSubmitData) => {
    if (!editingEnvironment) return;
    updateEnvironment.mutate(
      { 
        id: editingEnvironment.id, 
        ...data,
        description: data.description || null,
        azure_tag_filter: data.azure_tag_filter || null,
      },
      { onSuccess: () => setEditingEnvironment(null) }
    );
  };

  const handleDelete = (environment: Environment) => {
    deleteEnvironment.mutate({ id: environment.id, clientId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Environments</CardTitle>
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
        <CardTitle className="text-lg">Environments</CardTitle>
        {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Environment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Environment</DialogTitle>
              </DialogHeader>
              <EnvironmentForm
                onSubmit={handleCreate}
                onCancel={() => setIsCreateOpen(false)}
                isLoading={createEnvironment.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {environments?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p>No environments yet</p>
            {canEdit && <p className="text-sm">Add environments to organize resources</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {environments?.map((env) => (
              <Collapsible
                key={env.id}
                open={expandedEnvironments.has(env.id)}
                onOpenChange={() => toggleExpanded(env.id)}
              >
                <div className="rounded-lg border bg-card">
                  <div className="flex items-center justify-between p-4">
                    <CollapsibleTrigger asChild>
                      <button className="flex items-center gap-3 text-left hover:opacity-80">
                        {expandedEnvironments.has(env.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{env.name}</h4>
                            {env.azure_tenant_id && (
                              <Badge variant="outline" className="gap-1">
                                <Cloud className="h-3 w-3" />
                                Azure
                              </Badge>
                            )}
                          </div>
                          {env.description && (
                            <p className="text-sm text-muted-foreground">{env.description}</p>
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    {canEdit && (
                      <div className="flex gap-2">
                        <Dialog open={editingEnvironment?.id === env.id} onOpenChange={(open) => !open && setEditingEnvironment(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingEnvironment(env)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Environment</DialogTitle>
                            </DialogHeader>
                            <EnvironmentForm
                              environment={editingEnvironment || undefined}
                              onSubmit={handleUpdate}
                              onCancel={() => setEditingEnvironment(null)}
                              isLoading={updateEnvironment.isPending}
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
                                <AlertDialogTitle>Delete Environment</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{env.name}"? This will also delete all resources in this environment. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(env)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    )}
                  </div>
                  <CollapsibleContent>
                    <div className="border-t px-4 pb-4 pt-4">
                      {env.azure_tenant_id ? (
                        <Tabs defaultValue="monitored" className="w-full">
                          <TabsList className="mb-4">
                            <TabsTrigger value="monitored" className="gap-2">
                              <Server className="h-4 w-4" />
                              Monitored
                            </TabsTrigger>
                            <TabsTrigger value="azure" className="gap-2">
                              <Cloud className="h-4 w-4" />
                              Azure Resources
                            </TabsTrigger>
                            <TabsTrigger value="costs" className="gap-2">
                              <DollarSign className="h-4 w-4" />
                              Costs
                            </TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="monitored">
                            <ResourceList environmentId={env.id} title="Monitored Resources" />
                          </TabsContent>
                          
                          <TabsContent value="azure">
                            <EnvironmentAzureResources environmentId={env.id} />
                          </TabsContent>
                          
                          <TabsContent value="costs">
                            <EnvironmentCostOverview tenantId={env.azure_tenant_id} />
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <ResourceList environmentId={env.id} title="Resources" />
                      )}
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
