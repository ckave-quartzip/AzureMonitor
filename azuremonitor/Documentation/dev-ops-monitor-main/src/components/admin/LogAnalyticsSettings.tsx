import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  useLogAnalyticsWorkspaces, 
  useCreateLogAnalyticsWorkspace, 
  useDeleteLogAnalyticsWorkspace 
} from '@/hooks/useLogAnalyticsWorkspaces';
import { useAzureTenants } from '@/hooks/useAzureTenants';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Activity, AlertCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function LogAnalyticsSettings() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [resourceId, setResourceId] = useState('');

  const { data: workspaces, isLoading } = useLogAnalyticsWorkspaces();
  const { data: tenants } = useAzureTenants();
  const createWorkspace = useCreateLogAnalyticsWorkspace();
  const deleteWorkspace = useDeleteLogAnalyticsWorkspace();

  const handleAdd = async () => {
    if (!selectedTenantId || !workspaceId || !workspaceName || !resourceId) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await createWorkspace.mutateAsync({
        azure_tenant_id: selectedTenantId,
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        resource_id: resourceId,
      });
      toast.success('Log Analytics workspace added');
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to add workspace');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workspace?')) return;
    
    try {
      await deleteWorkspace.mutateAsync(id);
      toast.success('Workspace deleted');
    } catch (error) {
      toast.error('Failed to delete workspace');
    }
  };

  const resetForm = () => {
    setSelectedTenantId('');
    setWorkspaceId('');
    setWorkspaceName('');
    setResourceId('');
  };

  const getTenantName = (tenantId: string) => {
    return tenants?.find(t => t.id === tenantId)?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Log Analytics Workspaces
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Log Analytics Workspaces
            </CardTitle>
            <CardDescription>
              Configure Log Analytics workspaces for SQL wait statistics collection
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Workspace
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Log Analytics Workspace</DialogTitle>
                <DialogDescription>
                  Connect a Log Analytics workspace to collect SQL wait statistics.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Azure Tenant</Label>
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input
                    placeholder="e.g., Production-LogAnalytics"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Workspace ID</Label>
                  <Input
                    placeholder="e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in Azure Portal → Log Analytics → Properties → Workspace ID
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Resource ID</Label>
                  <Input
                    placeholder="/subscriptions/.../resourcegroups/.../providers/microsoft.operationalinsights/workspaces/..."
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Full Azure resource ID of the Log Analytics workspace
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={createWorkspace.isPending}>
                  {createWorkspace.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Workspace
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Azure Prerequisites</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>For wait statistics to work, configure in Azure Portal:</p>
            <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
              <li>Enable <strong>Diagnostic Settings</strong> on your SQL Database</li>
              <li>Enable <strong>QueryStoreWaitStatistics</strong> category</li>
              <li>Send logs to your Log Analytics workspace</li>
              <li>Grant <strong>Log Analytics Reader</strong> role to your App Registration</li>
            </ol>
            <a 
              href="https://learn.microsoft.com/en-us/azure/azure-sql/database/metrics-diagnostic-telemetry-logging-streaming-export-configure"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline text-sm mt-2"
            >
              Learn more <ExternalLink className="h-3 w-3" />
            </a>
          </AlertDescription>
        </Alert>

        {workspaces && workspaces.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Workspace ID</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.map((workspace) => (
                <TableRow key={workspace.id}>
                  <TableCell className="font-medium">{workspace.workspace_name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getTenantName(workspace.azure_tenant_id)}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{workspace.workspace_id}</TableCell>
                  <TableCell>{format(new Date(workspace.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(workspace.id)}
                      disabled={deleteWorkspace.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No Log Analytics workspaces configured</p>
            <p className="text-sm">Add a workspace to start collecting SQL wait statistics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
