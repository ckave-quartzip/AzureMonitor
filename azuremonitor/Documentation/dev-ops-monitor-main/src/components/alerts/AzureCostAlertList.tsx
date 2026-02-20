import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Eye,
  BellOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useAzureCostAlerts,
  useAcknowledgeAzureCostAlert,
  useResolveAzureCostAlert,
} from '@/hooks/useAzureCostAlerts';

const severityConfig = {
  critical: { 
    variant: 'destructive' as const, 
    icon: AlertTriangle,
    className: 'bg-destructive text-destructive-foreground'
  },
  warning: { 
    variant: 'default' as const, 
    icon: AlertTriangle,
    className: 'bg-yellow-500 text-white'
  },
  info: { 
    variant: 'secondary' as const, 
    icon: TrendingUp,
    className: 'bg-blue-500 text-white'
  },
};

export function AzureCostAlertList() {
  const [includeResolved, setIncludeResolved] = useState(false);
  const { data: alerts, isLoading } = useAzureCostAlerts({ includeResolved });
  const acknowledgeAlert = useAcknowledgeAzureCostAlert();
  const resolveAlert = useResolveAzureCostAlert();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Azure Cost Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Azure Cost Alerts
            </CardTitle>
            <CardDescription>
              Triggered alerts when costs exceed configured thresholds
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="show-resolved"
              checked={includeResolved}
              onCheckedChange={setIncludeResolved}
            />
            <Label htmlFor="show-resolved" className="text-sm">
              Show resolved
            </Label>
          </div>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Triggered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const config = severityConfig[alert.severity] || severityConfig.info;
                  const SeverityIcon = config.icon;
                  const overage = alert.current_cost - alert.threshold_amount;
                  const overagePercent = ((overage / alert.threshold_amount) * 100).toFixed(1);
                  const isSuppressed = (alert as any).notification_suppressed;
                  const suppressionReason = (alert as any).suppression_reason;

                  return (
                    <TableRow key={alert.id} className={alert.resolved_at ? 'opacity-60' : ''}>
                      <TableCell>
                        <Badge className={config.className}>
                          <SeverityIcon className="h-3 w-3 mr-1" />
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {alert.azure_cost_alert_rule?.name || 'Unknown Rule'}
                      </TableCell>
                      <TableCell>{alert.azure_tenant?.name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-destructive">
                            {formatCurrency(alert.current_cost)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            +{formatCurrency(overage)} ({overagePercent}% over)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(alert.threshold_amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {alert.triggered_at
                            ? formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })
                            : '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isSuppressed && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="gap-1 text-muted-foreground">
                                  <BellOff className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{suppressionReason || 'Notification suppressed during quiet hours'}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {alert.resolved_at ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Resolved
                            </Badge>
                          ) : alert.acknowledged_at ? (
                            <Badge variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Active</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!alert.acknowledged_at && !alert.resolved_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeAlert.mutate(alert.id)}
                              disabled={acknowledgeAlert.isPending}
                            >
                              Acknowledge
                            </Button>
                          )}
                          {!alert.resolved_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveAlert.mutate(alert.id)}
                              disabled={resolveAlert.isPending}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p>No active cost alerts</p>
              <p className="text-sm">
                {includeResolved 
                  ? 'No cost alerts have been triggered yet'
                  : 'All cost alerts have been resolved'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
