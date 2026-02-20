import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Globe, Radio, Shield, Network, Play, Loader2, Cloud, Heart, Activity } from 'lucide-react';
import { 
  useMonitoringChecks, 
  useCreateMonitoringCheck, 
  useUpdateMonitoringCheck, 
  useDeleteMonitoringCheck,
  useToggleMonitoringCheck,
  useRunMonitoringCheck,
  MonitoringCheck,
  MonitoringCheckInsert 
} from '@/hooks/useMonitoringChecks';
import { MonitoringCheckForm } from './MonitoringCheckForm';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface MonitoringCheckListProps {
  resourceId: string;
  resourceName?: string;
  azureResourceId?: string | null;
  azureResourceType?: string | null;
}

const CHECK_TYPE_ICONS: Record<string, typeof Globe> = {
  http: Globe,
  ping: Radio,
  ssl: Shield,
  port: Network,
  keyword: Globe,
  heartbeat: Heart,
  azure_metric: Cloud,
  azure_health: Activity,
};

const CHECK_TYPE_LABELS: Record<string, string> = {
  http: 'HTTP',
  ping: 'Ping',
  ssl: 'SSL',
  port: 'Port',
  keyword: 'Keyword',
  heartbeat: 'Heartbeat',
  azure_metric: 'Azure Metric',
  azure_health: 'Azure Health',
};

const COMPARISON_SYMBOLS: Record<string, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
};

export function MonitoringCheckList({ 
  resourceId, 
  resourceName, 
  azureResourceId,
  azureResourceType 
}: MonitoringCheckListProps) {
  const { isAdmin, isEditor } = useAuth();
  const canEdit = isAdmin || isEditor;
  
  const { data: checks, isLoading } = useMonitoringChecks(resourceId);
  const createCheck = useCreateMonitoringCheck();
  const updateCheck = useUpdateMonitoringCheck();
  const deleteCheck = useDeleteMonitoringCheck();
  const toggleCheck = useToggleMonitoringCheck();
  const { runCheck, isRunning } = useRunMonitoringCheck();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState<MonitoringCheck | null>(null);

  const handleRunAllChecks = () => {
    runCheck(undefined, resourceId);
  };

  const handleRunSingleCheck = (checkId: string) => {
    runCheck(checkId);
  };

  const handleCreate = (data: Omit<MonitoringCheckInsert, 'resource_id'>) => {
    createCheck.mutate(
      { ...data, resource_id: resourceId },
      { onSuccess: () => setIsCreateOpen(false) }
    );
  };

  const handleUpdate = (data: Omit<MonitoringCheckInsert, 'resource_id'>) => {
    if (!editingCheck) return;
    updateCheck.mutate(
      { id: editingCheck.id, ...data },
      { onSuccess: () => setEditingCheck(null) }
    );
  };

  const handleDelete = (check: MonitoringCheck) => {
    deleteCheck.mutate(check.id);
  };

  const handleToggle = (check: MonitoringCheck) => {
    toggleCheck.mutate({ id: check.id, is_enabled: !check.is_enabled });
  };

  const getCheckIcon = (type: string) => {
    const Icon = CHECK_TYPE_ICONS[type] || Globe;
    const isAzure = type === 'azure_metric' || type === 'azure_health';
    return <Icon className={`h-4 w-4 ${isAzure ? 'text-blue-500' : ''}`} />;
  };

  const getCheckTarget = (check: MonitoringCheck) => {
    const checkAny = check as any;
    
    if (check.check_type === 'azure_metric') {
      const operator = COMPARISON_SYMBOLS[checkAny.metric_comparison_operator] || '>';
      const aggregation = checkAny.aggregation_type || 'avg';
      const timeframe = checkAny.timeframe_minutes || 5;
      return `${checkAny.azure_metric_name || 'Metric'} ${operator} ${checkAny.metric_threshold_value} (${timeframe}m ${aggregation})`;
    }
    
    if (check.check_type === 'azure_health') {
      return 'Resource health status';
    }
    
    if (check.check_type === 'http' || check.check_type === 'ssl') {
      return check.url || 'No URL configured';
    }
    if (check.check_type === 'keyword') {
      return `${check.url || 'No URL'} → "${check.keyword_value || ''}"`;
    }
    if (check.check_type === 'heartbeat') {
      return `Every ${check.heartbeat_interval_seconds || 300}s`;
    }
    if (check.check_type === 'port') {
      return `${check.ip_address || 'No IP'}:${check.port || '?'}`;
    }
    return check.ip_address || 'No IP configured';
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monitoring Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-base">Monitoring Checks</CardTitle>
        <div className="flex items-center gap-2">
          {checks && checks.length > 0 && (
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={handleRunAllChecks}
              disabled={isRunning}
            >
              {isRunning ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Play className="mr-2 h-3 w-3" />
              )}
              Run All
            </Button>
          )}
          {canEdit && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="mr-2 h-3 w-3" />
                  Add Check
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Monitoring Check</DialogTitle>
                </DialogHeader>
                <MonitoringCheckForm
                  onSubmit={handleCreate}
                  onCancel={() => setIsCreateOpen(false)}
                  isLoading={createCheck.isPending}
                  azureResourceId={azureResourceId}
                  azureResourceType={azureResourceType}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {checks?.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Radio className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No monitoring checks configured</p>
            {canEdit && <p className="text-xs">Add checks to monitor this resource</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {checks?.map((check) => (
              <div
                key={check.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded shrink-0 ${
                    check.check_type === 'azure_metric' || check.check_type === 'azure_health'
                      ? 'bg-blue-500/10'
                      : 'bg-muted'
                  }`}>
                    {getCheckIcon(check.check_type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          check.check_type === 'azure_metric' || check.check_type === 'azure_health'
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                            : ''
                        }`}
                      >
                        {CHECK_TYPE_LABELS[check.check_type] || check.check_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        every {formatInterval(check.check_interval_seconds)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {getCheckTarget(check)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRunSingleCheck(check.id)}
                    disabled={isRunning || !check.is_enabled}
                    title="Run check now"
                  >
                    {isRunning ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                  
                  {canEdit && (
                    <>
                      <Switch
                        checked={check.is_enabled}
                        onCheckedChange={() => handleToggle(check)}
                        aria-label={check.is_enabled ? 'Disable check' : 'Enable check'}
                      />
                      
                      <Dialog 
                        open={editingCheck?.id === check.id} 
                        onOpenChange={(open) => !open && setEditingCheck(null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCheck(check)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Edit Monitoring Check</DialogTitle>
                          </DialogHeader>
                          <MonitoringCheckForm
                            check={editingCheck || undefined}
                            onSubmit={handleUpdate}
                            onCancel={() => setEditingCheck(null)}
                            isLoading={updateCheck.isPending}
                            azureResourceId={azureResourceId}
                            azureResourceType={azureResourceType}
                          />
                        </DialogContent>
                      </Dialog>
                      
                      {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Check</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this {CHECK_TYPE_LABELS[check.check_type]} check? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(check)}>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
