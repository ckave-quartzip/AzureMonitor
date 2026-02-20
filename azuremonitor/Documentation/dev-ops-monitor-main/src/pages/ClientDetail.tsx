import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Building2, Pencil, Trash2, Mail, DollarSign, Calendar } from 'lucide-react';
import { useClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients';
import { ClientForm } from '@/components/clients/ClientForm';
import { EnvironmentList } from '@/components/clients/EnvironmentList';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isEditor } = useAuth();
  const canEdit = isAdmin || isEditor;
  
  const { data: client, isLoading } = useClient(id);
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleUpdate = (data: any) => {
    if (!id) return;
    updateClient.mutate(
      { id, ...data },
      { onSuccess: () => setIsEditOpen(false) }
    );
  };

  const handleDelete = () => {
    if (!id) return;
    deleteClient.mutate(id, {
      onSuccess: () => navigate('/clients'),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
      case 'suspended':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </div>
            <div>
              <Skeleton className="h-48" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Client not found</h3>
              <p className="text-muted-foreground mb-4">The client you're looking for doesn't exist.</p>
              <Button asChild>
                <Link to="/clients">Back to Clients</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link to="/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Link>
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{client.name}</h1>
                  <Badge variant="outline" className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                </div>
                {client.description && (
                  <p className="text-muted-foreground">{client.description}</p>
                )}
              </div>
            </div>
            
            {canEdit && (
              <div className="flex gap-2">
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Edit Client</DialogTitle>
                    </DialogHeader>
                    <ClientForm
                      client={client}
                      onSubmit={handleUpdate}
                      onCancel={() => setIsEditOpen(false)}
                      isLoading={updateClient.isPending}
                    />
                  </DialogContent>
                </Dialog>
                
                {isAdmin && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Client</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{client.name}"? This will also delete all associated environments and resources. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.contact_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contact Email</p>
                    <p className="font-medium">{client.contact_email}</p>
                  </div>
                </div>
              )}
              
              {client.yearly_hosting_fee && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Yearly Hosting Fee</p>
                    <p className="font-medium">${Number(client.yearly_hosting_fee).toLocaleString()}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(client.created_at), 'PPP')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environments */}
          <div className="lg:col-span-2">
            <EnvironmentList clientId={client.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
