import { useState } from 'react';
import { AzureTenant, useDeleteAzureTenant } from '@/hooks/useAzureTenants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Cloud, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AzureTenantListProps {
  tenants: AzureTenant[];
  onEdit: (tenant: AzureTenant) => void;
  isLoading?: boolean;
}

export function AzureTenantList({ tenants, onEdit, isLoading }: AzureTenantListProps) {
  const [syncingTenantId, setSyncingTenantId] = useState<string | null>(null);
  const deleteTenant = useDeleteAzureTenant();

  const handleSync = async (tenantId: string) => {
    setSyncingTenantId(tenantId);
    try {
      const { data, error } = await supabase.functions.invoke('azure-resources', {
        body: {
          action: 'sync',
          tenantId,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      toast({
        title: 'Sync completed',
        description: data.message,
      });
    } catch (err) {
      toast({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSyncingTenantId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (tenants.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Azure Tenants Configured</h3>
          <p className="text-muted-foreground mt-1">
            Add an Azure tenant to start discovering and monitoring your Azure resources.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subscription ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{tenant.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {tenant.subscription_id.substring(0, 8)}...
                </TableCell>
                <TableCell>
                  <Badge variant={tenant.is_enabled ? 'default' : 'secondary'}>
                    {tenant.is_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {tenant.last_sync_at
                    ? format(new Date(tenant.last_sync_at), 'MMM d, yyyy HH:mm')
                    : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSync(tenant.id)}
                      disabled={syncingTenantId === tenant.id || !tenant.is_enabled}
                      title="Sync Resources"
                    >
                      {syncingTenantId === tenant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(tenant)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Azure Tenant</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{tenant.name}"? This will also remove all
                            cached resources, cost data, and metrics associated with this tenant.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteTenant.mutate(tenant.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
