import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Moon, 
  DollarSign, 
  RefreshCw, 
  EyeOff,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { useState } from 'react';
import { useIdleResources, useIdleResourcesSummary, useUpdateIdleResourceStatus, useRunIdleDetection } from '@/hooks/useIdleResources';
import { toast } from '@/hooks/use-toast';

interface IdleResourcesWidgetProps {
  tenantIds?: string[];
}

export function IdleResourcesWidget({ tenantIds }: IdleResourcesWidgetProps) {
  const { data: idleResources, isLoading: resourcesLoading } = useIdleResources();
  const { data: summary, isLoading: summaryLoading } = useIdleResourcesSummary(tenantIds);
  const updateStatus = useUpdateIdleResourceStatus();
  const runDetection = useRunIdleDetection();
  
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [ignoreReason, setIgnoreReason] = useState('');

  const handleRunDetection = async () => {
    try {
      const result = await runDetection.mutateAsync(undefined);
      toast({ 
        title: 'Idle detection complete', 
        description: `Found ${result.idleDetected} idle resources` 
      });
    } catch (error) {
      toast({ title: 'Detection failed', variant: 'destructive' });
    }
  };

  const handleIgnore = async () => {
    if (!selectedResource) return;
    
    try {
      await updateStatus.mutateAsync({
        id: selectedResource,
        status: 'ignored',
        ignoredReason: ignoreReason,
      });
      toast({ title: 'Resource ignored' });
      setIgnoreDialogOpen(false);
      setSelectedResource(null);
      setIgnoreReason('');
    } catch (error) {
      toast({ title: 'Failed to ignore', variant: 'destructive' });
    }
  };

  const handleAction = async (id: string, action: 'actioned' | 'resolved') => {
    try {
      await updateStatus.mutateAsync({ id, status: action });
      toast({ title: action === 'actioned' ? 'Marked as actioned' : 'Marked as resolved' });
    } catch (error) {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (resourcesLoading || summaryLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filter idle resources by tenantIds if provided
  const filteredIdleResources = tenantIds && tenantIds.length > 0
    ? (idleResources || []).filter(r => tenantIds.includes(r.azure_tenant_id))
    : idleResources || [];

  const topIdleResources = filteredIdleResources.slice(0, 5);
  const hasIdle = topIdleResources.length > 0;

  return (
    <>
      <Card className={hasIdle ? 'border-orange-500/50' : ''}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Moon className="h-4 w-4 text-orange-500" />
            Idle Resources
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunDetection}
            disabled={runDetection.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${runDetection.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary && summary.count > 0 && (
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-orange-500">{summary.count}</div>
                  <div className="text-xs text-muted-foreground">Idle resources detected</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{formatCurrency(summary.totalMonthlyCost)}</div>
                  <div className="text-xs text-muted-foreground">Monthly waste</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-orange-500/20">
                <div className="flex items-center gap-1 text-sm text-green-500">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">
                    {formatCurrency(summary.potentialAnnualSavings)} potential annual savings
                  </span>
                </div>
              </div>
            </div>
          )}

          {hasIdle ? (
            <div className="space-y-2">
              {topIdleResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {resource.resource?.name || 'Unknown Resource'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {resource.idle_reason}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {formatCurrency(resource.monthly_cost)}/mo
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Idle for {resource.idle_days}+ days
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedResource(resource.id);
                        setIgnoreDialogOpen(true);
                      }}
                      title="Ignore"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(resource.id, 'actioned')}
                      title="Mark as actioned"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(resource.id, 'resolved')}
                      title="Mark as resolved"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Moon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No idle resources detected</p>
              <p className="text-xs">All resources are being utilized</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={ignoreDialogOpen} onOpenChange={setIgnoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignore Idle Resource</DialogTitle>
            <DialogDescription>
              Provide a reason for ignoring this idle resource detection. It won't appear in future alerts.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g., Reserved for disaster recovery, Seasonal workload..."
            value={ignoreReason}
            onChange={(e) => setIgnoreReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIgnoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIgnore} disabled={!ignoreReason.trim()}>
              Ignore Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
