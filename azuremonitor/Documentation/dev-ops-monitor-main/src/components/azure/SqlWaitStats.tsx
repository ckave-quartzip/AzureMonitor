import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSqlWaitStats, useSyncWaitStats } from '@/hooks/useSqlWaitStats';
import { Loader2, Clock, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SqlWaitStatsProps {
  resourceId: string;
  tenantId?: string;
}

// Wait type categories for color coding
const WAIT_CATEGORIES: Record<string, { color: string; description: string }> = {
  'PAGEIOLATCH': { color: 'bg-red-500', description: 'Disk I/O wait - consider index optimization or faster storage' },
  'PAGELATCH': { color: 'bg-orange-500', description: 'Memory contention - possible hot page issue' },
  'LCK_M': { color: 'bg-yellow-500', description: 'Lock wait - check for blocking queries or transaction issues' },
  'ASYNC_NETWORK': { color: 'bg-blue-400', description: 'Network wait - client processing slowly or network latency' },
  'WRITELOG': { color: 'bg-purple-500', description: 'Transaction log write wait - may need faster log storage' },
  'SOS_SCHEDULER': { color: 'bg-pink-500', description: 'CPU scheduling wait - possible CPU pressure' },
  'CXPACKET': { color: 'bg-cyan-500', description: 'Parallel query synchronization - usually normal for parallel plans' },
  'RESOURCE_SEMAPHORE': { color: 'bg-red-600', description: 'Memory grant wait - queries waiting for memory' },
};

function getWaitCategory(waitType: string): { color: string; description: string } {
  for (const [prefix, category] of Object.entries(WAIT_CATEGORIES)) {
    if (waitType.startsWith(prefix)) {
      return category;
    }
  }
  return { color: 'bg-slate-500', description: 'Other wait type' };
}

export function SqlWaitStats({ resourceId, tenantId }: SqlWaitStatsProps) {
  const { data: waitStats, isLoading, error } = useSqlWaitStats(resourceId);
  const syncMutation = useSyncWaitStats(tenantId);

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
      toast.success('Wait statistics synced successfully');
    } catch (err) {
      toast.error(`Failed to sync wait stats: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Wait Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Wait Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load wait statistics</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!waitStats || waitStats.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Wait Statistics
            </CardTitle>
            <CardDescription>
              SQL Server wait types that indicate where queries spend time waiting
            </CardDescription>
          </div>
          {tenantId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync from Log Analytics
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>No Wait Statistics Available</AlertTitle>
            <AlertDescription>
              Wait statistics require Log Analytics integration. Configure a Log Analytics workspace in Admin → Azure → Log Analytics to collect wait stats via Diagnostic Settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Calculate max wait time for percentage bars
  const maxWaitTime = Math.max(...waitStats.map(w => Number(w.wait_time_ms)));
  const totalWaitTime = waitStats.reduce((sum, w) => sum + Number(w.wait_time_ms), 0);

  // Find high impact waits
  const highImpactWaits = waitStats.filter(w => {
    const category = getWaitCategory(w.wait_type);
    const percentage = (Number(w.wait_time_ms) / totalWaitTime) * 100;
    return percentage > 20 && (category.color.includes('red') || category.color.includes('yellow'));
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Wait Statistics
          </CardTitle>
          <CardDescription>
            Top wait types indicating where queries spend time waiting (last 24h)
          </CardDescription>
        </div>
        {tenantId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {highImpactWaits.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>High Impact Waits Detected</AlertTitle>
            <AlertDescription>
              {highImpactWaits.map(w => {
                const category = getWaitCategory(w.wait_type);
                return (
                  <p key={w.id} className="mt-1">
                    <strong>{w.wait_type}</strong>: {category.description}
                  </p>
                );
              })}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <TooltipProvider>
            {waitStats.map((stat) => {
              const percentage = maxWaitTime > 0 ? (Number(stat.wait_time_ms) / maxWaitTime) * 100 : 0;
              const overallPercentage = totalWaitTime > 0 ? (Number(stat.wait_time_ms) / totalWaitTime) * 100 : 0;
              const category = getWaitCategory(stat.wait_type);
              
              return (
                <div key={stat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono cursor-help">{stat.wait_type}</span>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p>{category.description}</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {overallPercentage.toFixed(1)}%
                      </Badge>
                      <span className="text-muted-foreground">
                        {formatWaitTime(Number(stat.wait_time_ms))}
                      </span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-muted rounded overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full ${category.color} rounded transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Count: {stat.wait_count?.toLocaleString()}</span>
                    <span>Avg: {formatWaitTime(Number(stat.avg_wait_time_ms))}</span>
                  </div>
                </div>
              );
            })}
          </TooltipProvider>
        </div>

        <div className="rounded-lg bg-muted/50 p-4 mt-4">
          <h4 className="font-medium text-sm mb-2">Wait Type Legend</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(WAIT_CATEGORIES).slice(0, 6).map(([prefix, { color, description }]) => (
              <div key={prefix} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${color}`} />
                <span className="font-mono">{prefix}*</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatWaitTime(ms: number): string {
  if (ms >= 3600000) {
    return `${(ms / 3600000).toFixed(1)}h`;
  } else if (ms >= 60000) {
    return `${(ms / 60000).toFixed(1)}m`;
  } else if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms.toFixed(0)}ms`;
}
