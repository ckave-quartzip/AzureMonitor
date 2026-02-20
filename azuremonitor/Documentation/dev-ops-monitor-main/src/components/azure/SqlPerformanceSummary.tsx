import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Cpu, HardDrive, AlertTriangle, Activity, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSqlPerformanceStats, useSqlPerformanceTrend } from '@/hooks/useAzureSqlPerformance';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface SqlPerformanceSummaryProps {
  resourceId: string;
  onSync?: () => void;
  isSyncing?: boolean;
}

function getStatusColor(value: number | null): string {
  if (value === null) return 'text-muted-foreground';
  if (value > 80) return 'text-destructive';
  if (value > 60) return 'text-yellow-500';
  return 'text-green-500';
}

function getProgressColor(value: number | null): string {
  if (value === null) return 'bg-muted';
  if (value > 80) return 'bg-destructive';
  if (value > 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function SqlPerformanceSummary({ resourceId, onSync, isSyncing }: SqlPerformanceSummaryProps) {
  const { data: stats, isLoading } = useSqlPerformanceStats(resourceId);
  const { data: trend } = useSqlPerformanceTrend(resourceId, 24);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const cpuPercent = stats?.cpu_percent ?? null;
  const dtuPercent = stats?.dtu_percent ?? null;
  const storagePercent = stats?.storage_percent ?? null;
  const deadlockCount = stats?.deadlock_count ?? 0;
  const blockedCount = stats?.blocked_count ?? 0;

  const chartData = trend?.map(t => ({
    time: new Date(t.timestamp_utc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    cpu: t.cpu_percent ?? 0,
    dtu: t.dtu_percent ?? 0,
  })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Summary
          </CardTitle>
          <CardDescription>
            Current resource utilization and health metrics
          </CardDescription>
        </div>
        {onSync && (
          <Button variant="outline" size="sm" onClick={onSync} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* CPU Usage */}
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">CPU</span>
              </div>
              <span className={`text-lg font-bold ${getStatusColor(cpuPercent)}`}>
                {cpuPercent !== null ? `${cpuPercent.toFixed(0)}%` : 'N/A'}
              </span>
            </div>
            <Progress 
              value={cpuPercent ?? 0} 
              className="h-2"
              // @ts-ignore - custom indicator color
              indicatorClassName={getProgressColor(cpuPercent)}
            />
          </div>

          {/* DTU Usage */}
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">DTU</span>
              </div>
              <span className={`text-lg font-bold ${getStatusColor(dtuPercent)}`}>
                {dtuPercent !== null ? `${dtuPercent.toFixed(0)}%` : 'N/A'}
              </span>
            </div>
            <Progress 
              value={dtuPercent ?? 0} 
              className="h-2"
              // @ts-ignore
              indicatorClassName={getProgressColor(dtuPercent)}
            />
          </div>

          {/* Storage */}
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Storage</span>
              </div>
              <span className={`text-lg font-bold ${getStatusColor(storagePercent)}`}>
                {storagePercent !== null ? `${storagePercent.toFixed(0)}%` : 'N/A'}
              </span>
            </div>
            <Progress 
              value={storagePercent ?? 0} 
              className="h-2"
              // @ts-ignore
              indicatorClassName={getProgressColor(storagePercent)}
            />
          </div>

          {/* Issues */}
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Issues</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <Badge variant={deadlockCount > 0 ? 'destructive' : 'secondary'}>
                  {deadlockCount}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Deadlocks</p>
              </div>
              <div className="text-center">
                <Badge variant={blockedCount > 0 ? 'destructive' : 'secondary'}>
                  {blockedCount}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Blocked</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        {chartData.length > 1 && (
          <div>
            <p className="text-sm font-medium mb-2">24-Hour Trend</p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name.toUpperCase()]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  name="cpu"
                />
                <Line 
                  type="monotone" 
                  dataKey="dtu" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={false}
                  name="dtu"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">CPU</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
                <span className="text-xs text-muted-foreground">DTU</span>
              </div>
            </div>
          </div>
        )}

        {!stats && (
          <div className="text-center py-4 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No performance data available</p>
            <p className="text-sm">Sync SQL insights to collect metrics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
