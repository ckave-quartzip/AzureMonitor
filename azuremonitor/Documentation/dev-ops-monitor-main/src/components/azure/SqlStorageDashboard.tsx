import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { HardDrive, TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar } from 'lucide-react';
import { useSqlStorageTrends, useSqlStorageLatest, useStorageProjection, formatBytes } from '@/hooks/useSqlStorageTrends';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { format } from 'date-fns';

interface SqlStorageDashboardProps {
  resourceId: string;
}

function getStorageStatusColor(percent: number | null): string {
  if (percent === null) return 'text-muted-foreground';
  if (percent > 90) return 'text-destructive';
  if (percent > 80) return 'text-yellow-500';
  return 'text-green-500';
}

function getProgressIndicatorClass(percent: number | null): string {
  if (percent === null) return 'bg-muted';
  if (percent > 90) return 'bg-destructive';
  if (percent > 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

function GrowthTrendIcon({ trend }: { trend: 'stable' | 'increasing' | 'decreasing' }) {
  if (trend === 'increasing') return <TrendingUp className="h-4 w-4 text-yellow-500" />;
  if (trend === 'decreasing') return <TrendingDown className="h-4 w-4 text-green-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function SqlStorageDashboard({ resourceId }: SqlStorageDashboardProps) {
  const { data: latestStorage, isLoading: loadingLatest } = useSqlStorageLatest(resourceId);
  const { data: storageTrends, isLoading: loadingTrends } = useSqlStorageTrends(resourceId, 30);
  const { data: projection, isLoading: loadingProjection } = useStorageProjection(resourceId);

  const isLoading = loadingLatest || loadingTrends || loadingProjection;

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
          <Skeleton className="h-48 mt-4" />
        </CardContent>
      </Card>
    );
  }

  const usedBytes = latestStorage?.data_space_used_bytes;
  const allocatedBytes = latestStorage?.data_space_allocated_bytes;
  const maxBytes = latestStorage?.max_size_bytes;
  const storagePercent = latestStorage?.storage_percent;
  const logUsedPercent = latestStorage?.log_space_used_percent;

  // Build chart data
  const chartData = storageTrends?.filter(t => t.data_space_used_bytes !== null).map(t => ({
    timestamp: t.timestamp_utc,
    time: format(new Date(t.timestamp_utc), 'MMM d'),
    usedGB: (t.data_space_used_bytes || 0) / (1024 * 1024 * 1024),
    allocatedGB: (t.data_space_allocated_bytes || 0) / (1024 * 1024 * 1024),
  })) || [];

  // Check for critical status
  const isCritical = storagePercent !== null && storagePercent > 90;
  const isWarning = storagePercent !== null && storagePercent > 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Database Storage
          {isCritical && <Badge variant="destructive">Critical</Badge>}
          {!isCritical && isWarning && <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">Warning</Badge>}
        </CardTitle>
        <CardDescription>
          Storage usage, trends, and capacity planning
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Current Size */}
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Used</span>
              <span className={`text-lg font-bold ${getStorageStatusColor(storagePercent)}`}>
                {formatBytes(usedBytes)}
              </span>
            </div>
            {projection && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <GrowthTrendIcon trend={projection.growthTrend} />
                <span>
                  {projection.monthlyGrowthBytes > 0 ? '+' : ''}
                  {formatBytes(projection.monthlyGrowthBytes)}/month
                </span>
              </div>
            )}
          </div>

          {/* Allocated */}
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Allocated</span>
              <span className="text-lg font-bold">{formatBytes(allocatedBytes)}</span>
            </div>
            {storagePercent !== null && (
              <div className="space-y-1">
                <Progress 
                  value={storagePercent} 
                  className="h-2"
                  // @ts-ignore
                  indicatorClassName={getProgressIndicatorClass(storagePercent)}
                />
                <p className="text-xs text-muted-foreground">{storagePercent.toFixed(1)}% used</p>
              </div>
            )}
          </div>

          {/* Max Size */}
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Max Size</span>
              <span className="text-lg font-bold">{formatBytes(maxBytes)}</span>
            </div>
            {logUsedPercent !== null && (
              <p className="text-xs text-muted-foreground">
                Log: {logUsedPercent.toFixed(1)}% used
              </p>
            )}
          </div>

          {/* Days Until Full */}
          <div className="space-y-2 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Capacity</span>
              {projection?.daysUntilFull ? (
                <span className={`text-lg font-bold ${projection.daysUntilFull < 30 ? 'text-destructive' : projection.daysUntilFull < 90 ? 'text-yellow-500' : 'text-green-500'}`}>
                  {projection.daysUntilFull} days
                </span>
              ) : (
                <span className="text-lg font-bold text-green-500">Stable</span>
              )}
            </div>
            {projection?.projectedFullDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Full by {format(projection.projectedFullDate, 'MMM d, yyyy')}</span>
              </div>
            )}
            {!projection?.daysUntilFull && (
              <p className="text-xs text-muted-foreground">
                Growth rate: {formatBytes(projection?.dailyGrowthBytes || 0)}/day
              </p>
            )}
          </div>
        </div>

        {/* Capacity Warning */}
        {projection?.daysUntilFull && projection.daysUntilFull < 30 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Storage capacity warning</p>
              <p className="text-xs text-muted-foreground">
                At current growth rate ({formatBytes(projection.dailyGrowthBytes)}/day), storage will be full in {projection.daysUntilFull} days.
                Consider scaling up or archiving old data.
              </p>
            </div>
          </div>
        )}

        {/* Storage Trend Chart */}
        {chartData.length > 1 && (
          <div>
            <p className="text-sm font-medium mb-2">Storage Trend (30 Days)</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${v.toFixed(1)} GB`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(2)} GB`, 'Used']}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <defs>
                  <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="usedGB" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#storageGradient)"
                  strokeWidth={2}
                />
                {maxBytes && (
                  <ReferenceLine 
                    y={maxBytes / (1024 * 1024 * 1024)} 
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="5 5"
                    label={{ value: 'Max', position: 'right', fontSize: 10 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Used Space</span>
              </div>
              {maxBytes && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-destructive" style={{ borderTop: '2px dashed' }} />
                  <span className="text-xs text-muted-foreground">Max Size</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!chartData.length && !usedBytes && (
          <div className="text-center py-4 text-muted-foreground">
            <HardDrive className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No storage data available</p>
            <p className="text-sm">Storage metrics will appear after sync</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
