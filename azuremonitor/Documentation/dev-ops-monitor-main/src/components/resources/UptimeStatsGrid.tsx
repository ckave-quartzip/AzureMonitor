import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UptimePeriodStats {
  percentage: number;
  incidentCount: number;
  totalDowntimeMs: number;
  totalChecks: number;
}

interface UptimeStatsGridProps {
  uptime7d: UptimePeriodStats;
  uptime30d: UptimePeriodStats;
  uptime365d: UptimePeriodStats;
}

function formatDowntime(ms: number): string {
  if (ms === 0) return '0s';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function UptimeCard({ 
  title, 
  stats 
}: { 
  title: string; 
  stats: UptimePeriodStats;
}) {
  const getPercentageColor = (pct: number) => {
    if (pct >= 99.9) return 'text-emerald-500';
    if (pct >= 99) return 'text-emerald-600';
    if (pct >= 95) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-3xl font-bold', getPercentageColor(stats.percentage))}>
          {stats.percentage.toFixed(3)}%
        </div>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Incidents</span>
            <span className="font-medium text-foreground">{stats.incidentCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Downtime</span>
            <span className="font-medium text-foreground">{formatDowntime(stats.totalDowntimeMs)}</span>
          </div>
          {stats.totalChecks > 0 && (
            <div className="flex justify-between">
              <span>Checks</span>
              <span className="font-medium text-foreground">{stats.totalChecks.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function UptimeStatsGrid({ uptime7d, uptime30d, uptime365d }: UptimeStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UptimeCard title="Last 7 days" stats={uptime7d} />
      <UptimeCard title="Last 30 days" stats={uptime30d} />
      <UptimeCard title="Last 365 days" stats={uptime365d} />
    </div>
  );
}
