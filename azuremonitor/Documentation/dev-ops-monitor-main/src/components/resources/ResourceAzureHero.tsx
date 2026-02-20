import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, Activity, Cpu, Database, Gauge } from 'lucide-react';
import { useResourceAzureCost, useResourceAzureMetrics } from '@/hooks/useResourceAzureDetails';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface ResourceAzureHeroProps {
  azureResourceId: string;
  resourceType?: string;
}

export function ResourceAzureHero({ azureResourceId, resourceType }: ResourceAzureHeroProps) {
  const { data: costData, isLoading: isLoadingCost } = useResourceAzureCost(azureResourceId);
  const { data: metricsData, isLoading: isLoadingMetrics } = useResourceAzureMetrics(azureResourceId);

  // Determine which metrics to show based on resource type
  const isSql = resourceType?.toLowerCase().includes('sql') || resourceType?.toLowerCase().includes('database');
  
  // Find primary metrics
  const metricNames = Object.keys(metricsData || {});
  const cpuMetric = metricNames.find(n => n.toLowerCase().includes('cpu'));
  const dtuMetric = metricNames.find(n => n.toLowerCase().includes('dtu'));
  const memoryMetric = metricNames.find(n => n.toLowerCase().includes('memory'));
  const storageMetric = metricNames.find(n => n.toLowerCase().includes('storage'));

  const primaryMetric = isSql ? (dtuMetric || cpuMetric) : (cpuMetric || dtuMetric);
  const secondaryMetric = isSql ? storageMetric : memoryMetric;

  // Get latest metric values
  const getLatestMetricValue = (metricName: string | undefined) => {
    if (!metricName || !metricsData?.[metricName]) return null;
    const metrics = metricsData[metricName];
    if (metrics.length === 0) return null;
    const sorted = [...metrics].sort((a, b) => 
      new Date(b.timestamp_utc).getTime() - new Date(a.timestamp_utc).getTime()
    );
    return sorted[0]?.average ?? sorted[0]?.total ?? null;
  };

  // Get metric sparkline data
  const getMetricSparkline = (metricName: string | undefined) => {
    if (!metricName || !metricsData?.[metricName]) return [];
    const metrics = metricsData[metricName];
    return [...metrics]
      .sort((a, b) => new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime())
      .slice(-20)
      .map(m => ({ value: m.average ?? m.total ?? 0 }));
  };

  const primaryValue = getLatestMetricValue(primaryMetric);
  const secondaryValue = getLatestMetricValue(secondaryMetric);
  const primarySparkline = getMetricSparkline(primaryMetric);
  const secondarySparkline = getMetricSparkline(secondaryMetric);

  // Calculate cost trend
  const costTrendPercent = costData?.costTrend && costData.costTrend.length >= 7 
    ? (() => {
        const recent = costData.costTrend.slice(-7);
        const older = costData.costTrend.slice(-14, -7);
        if (older.length === 0) return 0;
        const recentSum = recent.reduce((s, d) => s + d.cost, 0);
        const olderSum = older.reduce((s, d) => s + d.cost, 0);
        if (olderSum === 0) return 0;
        return ((recentSum - olderSum) / olderSum) * 100;
      })()
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: costData?.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatMetricValue = (value: number | null, isPercent?: boolean) => {
    if (value === null) return '--';
    if (isPercent) return `${value.toFixed(1)}%`;
    if (value > 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value > 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(1);
  };

  if (isLoadingCost && isLoadingMetrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Cost Card */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-sm text-muted-foreground">Monthly Cost</span>
            </div>
            {costTrendPercent !== 0 && (
              <Badge 
                variant={costTrendPercent > 0 ? "destructive" : "secondary"}
                className="gap-1 text-xs"
              >
                {costTrendPercent > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(costTrendPercent).toFixed(0)}%
              </Badge>
            )}
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold">
              {costData ? formatCurrency(costData.totalCost) : '--'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">vs last week</p>
          </div>
          {costData?.costTrend && costData.costTrend.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costData.costTrend.slice(-14)}>
                  <Area 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="hsl(var(--chart-1))" 
                    fill="hsl(var(--chart-1))"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Primary Metric Card (CPU/DTU) */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              {isSql ? <Gauge className="h-4 w-4 text-blue-500" /> : <Cpu className="h-4 w-4 text-blue-500" />}
            </div>
            <span className="text-sm text-muted-foreground">
              {isSql ? 'DTU Usage' : 'CPU Usage'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold">
              {formatMetricValue(primaryValue, true)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Current utilization</p>
          </div>
          {primarySparkline.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={primarySparkline}>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--chart-2))" 
                    fill="hsl(var(--chart-2))"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secondary Metric Card (Memory/Storage) */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              {isSql ? <Database className="h-4 w-4 text-purple-500" /> : <Activity className="h-4 w-4 text-purple-500" />}
            </div>
            <span className="text-sm text-muted-foreground">
              {isSql ? 'Storage Used' : 'Memory Usage'}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold">
              {formatMetricValue(secondaryValue, !isSql)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isSql ? 'Bytes used' : 'Current utilization'}
            </p>
          </div>
          {secondarySparkline.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-12 opacity-30">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={secondarySparkline}>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--chart-3))" 
                    fill="hsl(var(--chart-3))"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
