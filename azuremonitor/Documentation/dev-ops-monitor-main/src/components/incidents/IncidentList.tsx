import { useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, Eye, Search, Plus, Pencil, Trash2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIncidents, useCreateIncident, useUpdateIncident, useDeleteIncident, Incident } from '@/hooks/useIncidents';
import { IncidentForm } from './IncidentForm';
import { IncidentDetail } from './IncidentDetail';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  open: { icon: AlertCircle, color: 'bg-red-500', label: 'Open' },
  investigating: { icon: Search, color: 'bg-yellow-500', label: 'Investigating' },
  resolved: { icon: CheckCircle, color: 'bg-green-500', label: 'Resolved' },
};

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  info: { color: 'bg-blue-500', label: 'Info' },
  warning: { color: 'bg-yellow-500', label: 'Warning' },
  critical: { color: 'bg-red-500', label: 'Critical' },
};

type IncidentStatus = 'open' | 'investigating' | 'resolved';

export function IncidentList() {
  const { isAdmin, isEditor } = useAuth();
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');
  const { data: incidents, isLoading } = useIncidents(statusFilter === 'all' ? undefined : statusFilter);
  const createIncident = useCreateIncident();
  const updateIncident = useUpdateIncident();
  const deleteIncident = useDeleteIncident();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [viewingIncident, setViewingIncident] = useState<Incident | null>(null);

  const handleCreate = async (data: any) => {
    await createIncident.mutateAsync(data);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: any) => {
    if (!editingIncident) return;
    await updateIncident.mutateAsync({ id: editingIncident.id, ...data });
    setEditingIncident(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as IncidentStatus | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>

        {isEditor && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Incident</DialogTitle>
              </DialogHeader>
              <IncidentForm
                onSubmit={handleCreate}
                onCancel={() => setIsCreateOpen(false)}
                isLoading={createIncident.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(!incidents || incidents.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No incidents found</p>
            {isEditor && (
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Create your first incident
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => {
            const status = STATUS_CONFIG[incident.status] || STATUS_CONFIG.open;
            const severity = SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.warning;
            const StatusIcon = status.icon;
            const isResolved = incident.status === 'resolved';

            return (
              <Card key={incident.id} className={isResolved ? 'opacity-70' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${status.color}`}>
                        <StatusIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{incident.title}</CardTitle>
                        {incident.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {incident.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={severity.color.replace('bg-', 'border-')}>
                        {severity.label}
                      </Badge>
                      <Badge variant={isResolved ? 'secondary' : 'default'}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Started: {format(new Date(incident.started_at), 'PPp')}</p>
                      {incident.resolved_at && (
                        <p>Resolved: {format(new Date(incident.resolved_at), 'PPp')}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={viewingIncident?.id === incident.id} onOpenChange={(open) => !open && setViewingIncident(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setViewingIncident(incident)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Incident Details</DialogTitle>
                          </DialogHeader>
                          <IncidentDetail incident={incident} />
                        </DialogContent>
                      </Dialog>

                      {isEditor && (
                        <Dialog open={editingIncident?.id === incident.id} onOpenChange={(open) => !open && setEditingIncident(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingIncident(incident)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Incident</DialogTitle>
                            </DialogHeader>
                            <IncidentForm
                              incident={incident}
                              onSubmit={handleUpdate}
                              onCancel={() => setEditingIncident(null)}
                              isLoading={updateIncident.isPending}
                            />
                          </DialogContent>
                        </Dialog>
                      )}

                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Incident</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this incident? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteIncident.mutate(incident.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
