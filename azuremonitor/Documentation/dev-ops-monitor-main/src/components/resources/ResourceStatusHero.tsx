import { CheckCircle2, XCircle, AlertTriangle, Clock, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UptimeBarChart } from './UptimeBarChart';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ResourceStatusHeroProps {
  status: 'up' | 'down' | 'degraded' | 'unknown';
  statusDuration: string;
  lastCheckedAt: Date | null;
  checkInterval: number;
  hourlyData: { hour: number; status: 'up' | 'down' | 'degraded' | 'unknown' }[];
  uptime24h: number;
}

const STATUS_CONFIG = {
  up: {
    icon: CheckCircle2,
    label: 'Up',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  down: {
    icon: XCircle,
    label: 'Down',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/20',
  },
  degraded: {
    icon: AlertTriangle,
    label: 'Degraded',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
  },
  unknown: {
    icon: Activity,
    label: 'Unknown',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-border',
  },
};

export function ResourceStatusHero({
  status,
  statusDuration,
  lastCheckedAt,
  checkInterval,
  hourlyData,
  uptime24h,
}: ResourceStatusHeroProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const formatCheckInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minute${seconds >= 120 ? 's' : ''}`;
    return `${Math.round(seconds / 3600)} hour${seconds >= 7200 ? 's' : ''}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Current Status */}
      <Card className={cn('border-2', config.borderColor)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={cn('p-3 rounded-full', config.bgColor)}>
              <StatusIcon className={cn('h-8 w-8', config.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('text-2xl font-bold', config.color)}>
                  {config.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Currently {status === 'up' ? 'up' : status === 'down' ? 'down' : status} for {statusDuration}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Check */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-muted">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {lastCheckedAt ? formatDistanceToNow(lastCheckedAt, { addSuffix: false }) : 'Never'}
              </div>
              <p className="text-sm text-muted-foreground">
                Checked every {formatCheckInterval(checkInterval)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 24h Uptime Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Last 24 hours</span>
            <Badge variant={uptime24h >= 99 ? 'default' : uptime24h >= 95 ? 'secondary' : 'destructive'}>
              {uptime24h.toFixed(2)}%
            </Badge>
          </div>
          <UptimeBarChart data={hourlyData} />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>24h ago</span>
            <span>Now</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
