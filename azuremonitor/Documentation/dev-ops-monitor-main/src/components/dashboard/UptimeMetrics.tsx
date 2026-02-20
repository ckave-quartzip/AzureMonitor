import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useUptimeMetrics } from '@/hooks/useCheckResults';

interface UptimeCardProps {
  hours?: number;
}

export function UptimeCard({ hours = 24 }: UptimeCardProps) {
  const { data: metrics, isLoading } = useUptimeMetrics(undefined, hours);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  const uptime = metrics?.uptime ?? 100;
  const isGood = uptime >= 99;
  const isWarning = uptime >= 95 && uptime < 99;
  const isBad = uptime < 95;

  const getColor = () => {
    if (isGood) return 'text-green-500';
    if (isWarning) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = () => {
    if (isGood) return 'bg-green-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          Uptime ({hours}h)
        </CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-bold ${getColor()}`}>
            {uptime.toFixed(2)}%
          </span>
          {isGood ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </div>
        <Progress 
          value={uptime} 
          className="h-2 mt-3" 
        />
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{metrics?.successful || 0} passed</span>
          <span>{metrics?.failed || 0} failed</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function UptimeMetricsRow() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <UptimeCard hours={1} />
      <UptimeCard hours={24} />
      <UptimeCard hours={168} /> {/* 7 days */}
    </div>
  );
}
