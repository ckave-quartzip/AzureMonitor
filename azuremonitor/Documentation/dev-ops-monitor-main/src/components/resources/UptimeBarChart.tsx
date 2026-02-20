import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface UptimeBarChartProps {
  data: { hour: number; status: 'up' | 'down' | 'degraded' | 'unknown' }[];
}

const STATUS_COLORS = {
  up: 'bg-emerald-500',
  down: 'bg-destructive',
  degraded: 'bg-yellow-500',
  unknown: 'bg-muted',
};

export function UptimeBarChart({ data }: UptimeBarChartProps) {
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((item, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'flex-1 min-w-1 h-full rounded-sm transition-all hover:opacity-80 cursor-pointer',
                STATUS_COLORS[item.status]
              )}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {24 - data.length + index + 1}h ago: {item.status === 'up' ? '100% uptime' : item.status === 'down' ? 'Down' : item.status === 'degraded' ? 'Degraded' : 'No data'}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
