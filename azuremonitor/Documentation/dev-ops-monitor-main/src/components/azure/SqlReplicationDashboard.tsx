import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, ArrowRight, Globe, Server, Clock, 
  AlertTriangle, CheckCircle2, Activity 
} from 'lucide-react';
import { 
  useReplicationLinks, 
  useReplicationLagHistory, 
  useSyncReplication,
  getReplicationStateVariant,
  getReplicationStateDescription 
} from '@/hooks/useSqlReplication';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface SqlReplicationDashboardProps {
  resourceId: string;
  tenantId?: string;
}

function ReplicationLinkCard({ link }: { link: any }) {
  const { data: lagHistory, isLoading: loadingHistory } = useReplicationLagHistory(link.id, 24);

  const chartData = lagHistory?.map(h => ({
    time: format(new Date(h.recorded_at), 'HH:mm'),
    lag: h.lag_seconds || 0,
  })) || [];

  const avgLag = lagHistory?.length 
    ? lagHistory.reduce((sum, h) => sum + (h.lag_seconds || 0), 0) / lagHistory.length 
    : 0;
  const maxLag = lagHistory?.length 
    ? Math.max(...lagHistory.map(h => h.lag_seconds || 0))
    : 0;

  const isHealthy = link.replication_state?.toUpperCase() === 'CATCH_UP' || 
                    link.replication_state?.toUpperCase() === 'CATCHING_UP';

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-card">
      {/* Replication Flow */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{link.role === 'Primary' ? 'Primary' : 'Replica'}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>{link.partner_server}</span>
            {link.partner_location && (
              <Badge variant="outline" className="text-xs">
                {link.partner_location}
              </Badge>
            )}
          </div>
        </div>
        <Badge variant={getReplicationStateVariant(link.replication_state)}>
          {isHealthy && <CheckCircle2 className="h-3 w-3 mr-1" />}
          {link.replication_state || 'Unknown'}
        </Badge>
      </div>

      {/* Status Description */}
      <p className="text-xs text-muted-foreground">
        {getReplicationStateDescription(link.replication_state)}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Current Lag</p>
          <p className={`text-lg font-bold ${(link.replication_lag_seconds || 0) > 10 ? 'text-yellow-500' : 'text-green-500'}`}>
            {link.replication_lag_seconds !== null ? `${link.replication_lag_seconds}s` : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avg Lag (24h)</p>
          <p className="text-lg font-bold">{avgLag.toFixed(1)}s</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Max Lag (24h)</p>
          <p className={`text-lg font-bold ${maxLag > 30 ? 'text-destructive' : ''}`}>
            {maxLag.toFixed(1)}s
          </p>
        </div>
      </div>

      {/* Lag Chart */}
      {chartData.length > 1 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Lag History (24h)</p>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={chartData}>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 9 }}
                tickFormatter={(v) => `${v}s`}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip 
                formatter={(value: number) => [`${value}s`, 'Lag']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine 
                y={10} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="3 3"
              />
              <Line 
                type="monotone" 
                dataKey="lag" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Last Sync Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Last replicated: {link.last_replicated_time 
            ? formatDistanceToNow(new Date(link.last_replicated_time), { addSuffix: true })
            : 'Unknown'}
          </span>
        </div>
        <span>Mode: {link.replication_mode || 'ASYNC'}</span>
      </div>
    </div>
  );
}

export function SqlReplicationDashboard({ resourceId, tenantId }: SqlReplicationDashboardProps) {
  const { data: links, isLoading } = useReplicationLinks(resourceId);
  const syncMutation = useSyncReplication();

  const handleSync = async () => {
    if (!tenantId) {
      toast({
        title: 'Missing tenant',
        description: 'Could not determine Azure tenant for this resource',
        variant: 'destructive',
      });
      return;
    }

    try {
      await syncMutation.mutateAsync({ resourceId, tenantId });
      toast({
        title: 'Sync complete',
        description: 'Replication data has been refreshed',
      });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: 'Failed to sync replication data',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  // If no replication links, show message
  if (!links || links.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Geo-Replication
            </CardTitle>
            <CardDescription>
              Monitor replication status and lag
            </CardDescription>
          </div>
          {tenantId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Check
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No Geo-Replication Configured</p>
            <p className="text-sm mt-1">
              This database does not have geo-replication enabled.
            </p>
            <p className="text-xs mt-2">
              Configure geo-replication in Azure Portal to enable high availability.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check overall health
  const unhealthyLinks = links.filter(l => 
    l.replication_state?.toUpperCase() !== 'CATCH_UP' && 
    l.replication_state?.toUpperCase() !== 'CATCHING_UP'
  );
  const highLagLinks = links.filter(l => (l.replication_lag_seconds || 0) > 10);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Geo-Replication
            {unhealthyLinks.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {unhealthyLinks.length} issue{unhealthyLinks.length > 1 ? 's' : ''}
              </Badge>
            )}
            {unhealthyLinks.length === 0 && highLagLinks.length > 0 && (
              <Badge variant="secondary" className="gap-1 bg-yellow-500/10 text-yellow-600">
                High Lag
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {links.length} replication link{links.length > 1 ? 's' : ''} configured
          </CardDescription>
        </div>
        {tenantId && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {links.map((link) => (
          <ReplicationLinkCard key={link.id} link={link} />
        ))}
      </CardContent>
    </Card>
  );
}
