import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle, Clock, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentCheckResults } from '@/hooks/useCheckResults';

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Success' },
  failure: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
  timeout: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Timeout' },
};

const CHECK_TYPE_LABELS: Record<string, string> = {
  http: 'HTTP',
  ping: 'Ping',
  ssl: 'SSL',
  port: 'Port',
};

export function RecentCheckResults() {
  const { data: results, isLoading } = useRecentCheckResults(15);
  const [animate, setAnimate] = useState<string | null>(null);

  // Animate new results
  useEffect(() => {
    if (results && results.length > 0) {
      const latestId = results[0]?.id;
      if (latestId) {
        setAnimate(latestId);
        const timer = setTimeout(() => setAnimate(null), 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [results?.[0]?.id]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Check Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Check Results
          {results && results.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {!results || results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="h-8 w-8 mb-2" />
              <p className="text-sm">No check results yet</p>
              <p className="text-xs">Run some checks to see results here</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {results.map((result) => {
                const config = STATUS_CONFIG[result.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.failure;
                const StatusIcon = config.icon;
                const check = result.monitoring_checks as any;
                const resource = check?.resources;
                const isNew = animate === result.id;

                return (
                  <div
                    key={result.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isNew ? 'ring-2 ring-primary ring-offset-2' : ''
                    } ${config.bg}`}
                  >
                    <StatusIcon className={`h-5 w-5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {resource?.name || 'Unknown Resource'}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {CHECK_TYPE_LABELS[check?.check_type] || check?.check_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {result.response_time_ms && (
                          <span>{result.response_time_ms}ms</span>
                        )}
                        {result.status_code && (
                          <span>HTTP {result.status_code}</span>
                        )}
                        {result.error_message && (
                          <span className="truncate text-red-500">{result.error_message}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(result.checked_at), { addSuffix: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
