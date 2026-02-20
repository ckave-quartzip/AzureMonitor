import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  RefreshCw,
  Zap,
  History
} from 'lucide-react';
import { useUnacknowledgedAnomalies, useAcknowledgeAnomaly, useAnomalySummary, useRunAnomalyDetection } from '@/hooks/useCostAnomalies';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface CostAnomalyWidgetProps {
  tenantIds?: string[];
}

export function CostAnomalyWidget({ tenantIds }: CostAnomalyWidgetProps) {
  const [showHistorical, setShowHistorical] = useState(false);
  const { data: anomalies, isLoading: anomaliesLoading } = useUnacknowledgedAnomalies(showHistorical, tenantIds);
  const { data: summary, isLoading: summaryLoading } = useAnomalySummary(tenantIds);
  const acknowledgeAnomaly = useAcknowledgeAnomaly();
  const runDetection = useRunAnomalyDetection();

  const handleAcknowledge = async (id: string) => {
    try {
      await acknowledgeAnomaly.mutateAsync({ anomalyId: id });
      toast({ title: 'Anomaly acknowledged' });
    } catch (error) {
      toast({ title: 'Failed to acknowledge', variant: 'destructive' });
    }
  };

  const handleRunDetection = async () => {
    try {
      const result = await runDetection.mutateAsync({});
      toast({ 
        title: 'Anomaly detection complete', 
        description: `Found ${result.anomaliesDetected} anomalies (recent data only)` 
      });
    } catch (error) {
      toast({ title: 'Detection failed', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  if (anomaliesLoading || summaryLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const recentAnomalies = anomalies?.slice(0, 5) || [];
  const hasAnomalies = recentAnomalies.length > 0;

  return (
    <Card className={hasAnomalies && summary?.critical ? 'border-red-500/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Cost Anomalies
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRunDetection}
          disabled={runDetection.isPending}
        >
          <RefreshCw className={`h-4 w-4 ${runDetection.isPending ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold">{summary.unacknowledged}</div>
              <div className="text-xs text-muted-foreground">Unreviewed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-500">{summary.critical}</div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{summary.spikes}</div>
              <div className="text-xs text-muted-foreground">Spikes</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between py-2 border-t border-b">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <History className="h-3 w-3" />
            <Label htmlFor="show-historical" className="text-xs cursor-pointer">
              Include older anomalies
            </Label>
          </div>
          <Switch
            id="show-historical"
            checked={showHistorical}
            onCheckedChange={setShowHistorical}
            className="scale-75"
          />
        </div>

        {hasAnomalies ? (
          <div className="space-y-2">
            {recentAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {anomaly.anomaly_type === 'spike' ? (
                    <TrendingUp className="h-4 w-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getSeverityColor(anomaly.severity)} text-white text-xs`}>
                        {anomaly.deviation_percent > 0 ? '+' : ''}{anomaly.deviation_percent.toFixed(0)}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(anomaly.anomaly_date), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatCurrency(anomaly.actual_cost)} vs expected {formatCurrency(anomaly.expected_cost)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAcknowledge(anomaly.id)}
                  disabled={acknowledgeAnomaly.isPending}
                  className="flex-shrink-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No unacknowledged anomalies</p>
            <p className="text-xs">Cost patterns look normal</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
