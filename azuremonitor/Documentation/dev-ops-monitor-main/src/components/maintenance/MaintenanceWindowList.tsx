import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, Edit, Plus, Repeat, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useMaintenanceWindows, 
  useCreateMaintenanceWindow, 
  useUpdateMaintenanceWindow, 
  useDeleteMaintenanceWindow,
  MaintenanceWindow,
  MaintenanceWindowInsert,
  MaintenanceWindowUpdate 
} from '@/hooks/useMaintenanceWindows';
import { MaintenanceWindowForm } from './MaintenanceWindowForm';

interface MaintenanceWindowListProps {
  resourceId: string;
  resourceName?: string;
}

export function MaintenanceWindowList({ resourceId, resourceName }: MaintenanceWindowListProps) {
  const { hasRole, isAdmin, isEditor } = useAuth();
  const canEdit = isAdmin || isEditor;
  const canDelete = isAdmin;
  
  const { data: windows, isLoading } = useMaintenanceWindows(resourceId);
  const createMutation = useCreateMaintenanceWindow();
  const updateMutation = useUpdateMaintenanceWindow();
  const deleteMutation = useDeleteMaintenanceWindow();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState<MaintenanceWindow | null>(null);

  const handleCreate = async (data: MaintenanceWindowInsert) => {
    await createMutation.mutateAsync(data);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: MaintenanceWindowInsert) => {
    if (!editingWindow) return;
    const updates: MaintenanceWindowUpdate = {
      title: data.title,
      description: data.description,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      is_recurring: data.is_recurring,
      recurrence_pattern: data.recurrence_pattern,
    };
    await updateMutation.mutateAsync({ id: editingWindow.id, updates });
    setEditingWindow(null);
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const getWindowStatus = (window: MaintenanceWindow) => {
    const now = new Date();
    const start = new Date(window.starts_at);
    const end = new Date(window.ends_at);
    
    if (now >= start && now <= end) {
      return { label: 'Active', variant: 'destructive' as const };
    } else if (now < start) {
      return { label: 'Scheduled', variant: 'secondary' as const };
    } else {
      return { label: 'Completed', variant: 'outline' as const };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
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
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Maintenance Windows
          </CardTitle>
          <CardDescription>
            Scheduled maintenance periods when monitoring is paused
          </CardDescription>
        </div>
        {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Maintenance Window</DialogTitle>
                <DialogDescription>
                  Create a maintenance window for {resourceName || 'this resource'}. Monitoring checks will be paused during this period.
                </DialogDescription>
              </DialogHeader>
              <MaintenanceWindowForm
                resourceId={resourceId}
                onSubmit={handleCreate}
                onCancel={() => setIsCreateOpen(false)}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {!windows || windows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No maintenance windows scheduled
          </p>
        ) : (
          <div className="space-y-3">
            {windows.map((window) => {
              const status = getWindowStatus(window);
              return (
                <div
                  key={window.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{window.title}</span>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {window.is_recurring && (
                        <Badge variant="outline" className="gap-1">
                          <Repeat className="h-3 w-3" />
                          {window.recurrence_pattern}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(window.starts_at), 'MMM d, yyyy HH:mm')}
                      </span>
                      <span>→</span>
                      <span>{format(new Date(window.ends_at), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                    {window.description && (
                      <p className="text-sm text-muted-foreground">{window.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Dialog open={editingWindow?.id === window.id} onOpenChange={(open) => !open && setEditingWindow(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setEditingWindow(window)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Maintenance Window</DialogTitle>
                          </DialogHeader>
                          <MaintenanceWindowForm
                            resourceId={resourceId}
                            window={window}
                            onSubmit={handleUpdate}
                            onCancel={() => setEditingWindow(null)}
                            isLoading={updateMutation.isPending}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                    {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Maintenance Window?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the maintenance window "{window.title}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(window.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
