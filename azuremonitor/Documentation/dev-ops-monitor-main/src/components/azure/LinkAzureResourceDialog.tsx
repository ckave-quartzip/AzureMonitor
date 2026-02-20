import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link2, Plus, Search } from 'lucide-react';
import { AzureResource } from '@/hooks/useAzureResources';
import { useResources, useCreateResource, useUpdateResource, Resource } from '@/hooks/useResources';
import { useToast } from '@/hooks/use-toast';

const createResourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  resource_type: z.string().min(1, 'Resource type is required'),
  description: z.string().optional(),
});

type CreateResourceFormData = z.infer<typeof createResourceSchema>;

interface LinkAzureResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  azureResource: AzureResource;
  environmentId: string;
}

// Map Azure resource types to local resource types
function mapAzureToLocalType(azureType: string): string {
  const typeMap: Record<string, string> = {
    'microsoft.web/sites': 'website',
    'microsoft.sql/servers/databases': 'database',
    'microsoft.sql/servers': 'database',
    'microsoft.compute/virtualmachines': 'server',
    'microsoft.storage/storageaccounts': 'storage',
    'microsoft.containerservice/managedclusters': 'container',
    'microsoft.network/loadbalancers': 'load_balancer',
    'microsoft.cdn/profiles': 'cdn',
    'microsoft.network/dnszones': 'dns',
  };
  
  const lowerType = azureType.toLowerCase();
  return typeMap[lowerType] || 'other';
}

export function LinkAzureResourceDialog({ 
  open, 
  onOpenChange, 
  azureResource, 
  environmentId 
}: LinkAzureResourceDialogProps) {
  const [activeTab, setActiveTab] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { data: existingResources } = useResources(environmentId);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();

  const form = useForm<CreateResourceFormData>({
    resolver: zodResolver(createResourceSchema),
    defaultValues: {
      name: azureResource.name,
      resource_type: mapAzureToLocalType(azureResource.resource_type),
      description: `Azure: ${azureResource.resource_group} / ${azureResource.location}`,
    },
  });

  // Filter existing resources that don't already have an azure_resource_id
  const availableResources = existingResources?.filter(r => 
    !r.azure_resource_id && 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateAndLink = async (data: CreateResourceFormData) => {
    try {
      await createResource.mutateAsync({
        name: data.name,
        resource_type: data.resource_type,
        description: data.description || null,
        environment_id: environmentId,
        azure_resource_id: azureResource.id,
      });
      toast({
        title: 'Resource linked',
        description: `Created "${data.name}" and linked to Azure resource.`,
      });
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by the mutation
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedResourceId) return;
    
    try {
      await updateResource.mutateAsync({
        id: selectedResourceId,
        azure_resource_id: azureResource.id,
      });
      toast({
        title: 'Resource linked',
        description: 'Azure resource has been linked to the monitored resource.',
      });
      onOpenChange(false);
    } catch (error) {
      // Error toast is handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link to Monitoring
          </DialogTitle>
          <DialogDescription>
            Link Azure resource "{azureResource.name}" to a monitored resource to track health and metrics together.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Azure Resource Summary */}
          <div className="bg-muted p-3 rounded-md text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resource:</span>
              <span className="font-medium">{azureResource.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <Badge variant="outline">{azureResource.resource_type.split('/').pop()}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span>{azureResource.location}</span>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </TabsTrigger>
              <TabsTrigger value="link">
                <Link2 className="h-4 w-4 mr-2" />
                Link Existing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 mt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateAndLink)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resource Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="resource_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resource Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                            <SelectItem value="server">Server</SelectItem>
                            <SelectItem value="database">Database</SelectItem>
                            <SelectItem value="storage">Storage</SelectItem>
                            <SelectItem value="container">Container</SelectItem>
                            <SelectItem value="load_balancer">Load Balancer</SelectItem>
                            <SelectItem value="cdn">CDN</SelectItem>
                            <SelectItem value="dns">DNS</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>Optional description for the resource</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createResource.isPending}
                  >
                    {createResource.isPending ? 'Creating...' : 'Create & Link Resource'}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="link" className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search existing resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[200px] border rounded-md">
                {availableResources?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No available resources to link
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {availableResources?.map((resource) => (
                      <button
                        key={resource.id}
                        type="button"
                        onClick={() => setSelectedResourceId(resource.id)}
                        className={`w-full text-left p-2 rounded-md transition-colors ${
                          selectedResourceId === resource.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="font-medium">{resource.name}</div>
                        <div className="text-xs opacity-70 capitalize">
                          {resource.resource_type.replace('_', ' ')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Button
                className="w-full"
                onClick={handleLinkExisting}
                disabled={!selectedResourceId || updateResource.isPending}
              >
                {updateResource.isPending ? 'Linking...' : 'Link Selected Resource'}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
