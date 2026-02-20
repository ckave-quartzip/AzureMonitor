import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, XCircle, BellOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAlerts, useAcknowledgeAlert, useResolveAlert } from '@/hooks/useAlerts';
import { useAuth } from '@/contexts/AuthContext';

const SEVERITY_CONFIG = {
  info: { icon: Clock, color: 'bg-blue-500', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'bg-yellow-500', label: 'Warning' },
  critical: { icon: XCircle, color: 'bg-red-500', label: 'Critical' },
};

export function AlertList() {
  const { isEditor } = useAuth();
  const { data: alerts, isLoading, error } = useAlerts();
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive font-medium">Failed to load alerts</p>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No alerts found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {alerts.map((alert) => {
          const severity = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
          const SeverityIcon = severity.icon;
          const isResolved = !!alert.resolved_at;
          const isAcknowledged = !!alert.acknowledged_at;
          const isSuppressed = (alert as any).notification_suppressed;
          const suppressionReason = (alert as any).suppression_reason;

          return (
            <Card key={alert.id} className={isResolved ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${severity.color}`}>
                      <SeverityIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {(alert.resources as any)?.name || 'Unknown Resource'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {(alert.resources as any)?.resource_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSuppressed && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <BellOff className="h-3 w-3" />
                            Suppressed
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{suppressionReason || 'Notification was suppressed during quiet hours'}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Badge variant={isResolved ? 'secondary' : isAcknowledged ? 'outline' : 'destructive'}>
                      {isResolved ? 'Resolved' : isAcknowledged ? 'Acknowledged' : 'Active'}
                    </Badge>
                    <Badge variant="outline">{severity.label}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{alert.message}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground space-y-1">
                    {alert.triggered_at && (
                      <p>Triggered: {format(new Date(alert.triggered_at), 'PPp')}</p>
                    )}
                    {alert.acknowledged_at && (
                      <p>Acknowledged: {format(new Date(alert.acknowledged_at), 'PPp')}</p>
                    )}
                    {alert.resolved_at && (
                      <p>Resolved: {format(new Date(alert.resolved_at), 'PPp')}</p>
                    )}
                  </div>
                  {isEditor && !isResolved && (
                    <div className="flex gap-2">
                      {!isAcknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeAlert.mutate(alert.id)}
                          disabled={acknowledgeAlert.isPending}
                        >
                          Acknowledge
                        </Button>
                      )}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => resolveAlert.mutate(alert.id)}
                        disabled={resolveAlert.isPending}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
