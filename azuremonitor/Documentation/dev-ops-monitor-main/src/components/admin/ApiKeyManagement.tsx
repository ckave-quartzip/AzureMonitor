import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useApiKeys, useCreateApiKey, useUpdateApiKey, useDeleteApiKey, useRegenerateApiKey } from '@/hooks/useApiKeys';
import { useToast } from '@/hooks/use-toast';
import { Key, Plus, Copy, RefreshCw, Trash2, AlertTriangle, Check, Eye, EyeOff, ExternalLink, Book } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

export function ApiKeyManagement() {
  const { data: apiKeys, isLoading } = useApiKeys();
  const createApiKey = useCreateApiKey();
  const updateApiKey = useUpdateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const regenerateApiKey = useRegenerateApiKey();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the API key',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createApiKey.mutateAsync({
        name: newKeyName.trim(),
        expires_at: newKeyExpiry ? new Date(newKeyExpiry).toISOString() : null,
      });
      
      setCreatedKey(result.plainTextKey);
      setNewKeyName('');
      setNewKeyExpiry('');
      
      toast({
        title: 'API Key Created',
        description: 'Copy your key now - it will not be shown again!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create API key',
        variant: 'destructive',
      });
    }
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    toast({
      title: 'Copied!',
      description: 'API key copied to clipboard',
    });
  };

  const handleToggleEnabled = async (id: string, currentValue: boolean) => {
    try {
      await updateApiKey.mutateAsync({ id, is_enabled: !currentValue });
      toast({
        title: currentValue ? 'Key Disabled' : 'Key Enabled',
        description: `API key has been ${currentValue ? 'disabled' : 'enabled'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update API key',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await deleteApiKey.mutateAsync(id);
      toast({
        title: 'API Key Deleted',
        description: 'The API key has been permanently deleted',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete API key',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateKey = async (id: string) => {
    try {
      const result = await regenerateApiKey.mutateAsync(id);
      setCreatedKey(result.plainTextKey);
      setIsCreateDialogOpen(true);
      toast({
        title: 'API Key Regenerated',
        description: 'Copy your new key now - it will not be shown again!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate API key',
        variant: 'destructive',
      });
    }
  };

  const closeDialogAndReset = () => {
    setIsCreateDialogOpen(false);
    setCreatedKey(null);
    setShowKey(false);
    setNewKeyName('');
    setNewKeyExpiry('');
  };

  const getKeyStatus = (key: { is_enabled: boolean; expires_at: string | null }) => {
    if (!key.is_enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for external integrations (iOS, Android, Power BI, etc.)
              </CardDescription>
            </div>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            if (!open) closeDialogAndReset();
            else setIsCreateDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              {createdKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-emerald-500" />
                      API Key Created
                    </DialogTitle>
                    <DialogDescription className="text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Copy this key now! It will not be shown again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Input
                        type={showKey ? 'text' : 'password'}
                        value={createdKey}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopyKey(createdKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={closeDialogAndReset}>Done</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>
                      Create a new API key for external integrations. The key will only be shown once.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="key-name">Name</Label>
                      <Input
                        id="key-name"
                        placeholder="e.g., iOS App, Power BI Dashboard"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="key-expiry">Expiration Date (Optional)</Label>
                      <Input
                        id="key-expiry"
                        type="datetime-local"
                        value={newKeyExpiry}
                        onChange={(e) => setNewKeyExpiry(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeDialogAndReset}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateKey} disabled={createApiKey.isPending}>
                      {createApiKey.isPending ? 'Creating...' : 'Create Key'}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading API keys...</div>
        ) : !apiKeys || apiKeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No API keys created yet</p>
            <p className="text-sm">Create an API key to enable external integrations</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {key.key_prefix}
                      </code>
                    </TableCell>
                    <TableCell>{getKeyStatus(key)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {key.last_used_at 
                        ? formatDistanceToNow(new Date(key.last_used_at), { addSuffix: true })
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {key.request_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {key.expires_at 
                        ? format(new Date(key.expires_at), 'MMM d, yyyy')
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={key.is_enabled}
                          onCheckedChange={() => handleToggleEnabled(key.id, key.is_enabled)}
                        />
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Regenerate key">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will invalidate the current key and generate a new one. 
                                Any applications using the old key will stop working.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRegenerateKey(key.id)}>
                                Regenerate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete key">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. Any applications using this key will stop working immediately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteKey(key.id)}
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
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-4">
          <div>
            <h4 className="font-medium mb-2">API Endpoint</h4>
            <code className="text-sm bg-background px-3 py-2 rounded border block">
              https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api
            </code>
            <p className="text-sm text-muted-foreground mt-2">
              Include the API key in the <code className="bg-background px-1 rounded">X-API-Key</code> header with each request.
            </p>
          </div>
          
          <div className="flex items-center gap-2 pt-2 border-t">
            <Book className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Need help?</span>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <Link to="/api-docs" className="inline-flex items-center gap-1">
                View API Documentation
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
