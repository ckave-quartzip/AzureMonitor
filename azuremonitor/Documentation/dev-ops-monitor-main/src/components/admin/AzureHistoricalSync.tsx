import { useState } from 'react';
import { format, subMonths, startOfMonth, formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CalendarIcon, Database, Activity, Loader2, CheckCircle2, XCircle, Clock, DatabaseZap, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAzureTenants } from '@/hooks/useAzureTenants';
import { 
  useAzureSyncProgress, 
  useStartHistoricalCostSync, 
  useStartHistoricalMetricsSync,
  useStartHistoricalSqlInsightsSync,
  SyncProgress,
  ChunkDetail
} from '@/hooks/useAzureSyncProgress';
import { toast } from 'sonner';

function ChunkStatusIcon({ status }: { status: ChunkDetail['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    case 'running':
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    case 'failed':
      return <XCircle className="h-3 w-3 text-destructive" />;
    default:
      return <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />;
  }
}

function formatProcessingRate(rate: number | null): string {
  if (!rate || rate <= 0) return '';
  if (rate >= 1) return `${Math.round(rate)} records/sec`;
  return `${(rate * 60).toFixed(1)} records/min`;
}

function formatTimeRemaining(estimatedCompletion: string | null): string {
  if (!estimatedCompletion) return '';
  const date = new Date(estimatedCompletion);
  if (isNaN(date.getTime()) || date <= new Date()) return '';
  return formatDistanceToNow(date, { addSuffix: false });
}

function SyncProgressCard({ progress }: { progress: SyncProgress }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const percentComplete = progress.total_chunks > 0 
    ? Math.round((progress.completed_chunks / progress.total_chunks) * 100) 
    : 0;

  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-destructive" />,
  }[progress.status] || <Clock className="h-4 w-4" />;

  const statusVariant = {
    pending: 'secondary',
    running: 'default',
    completed: 'outline',
    failed: 'destructive',
  }[progress.status] as 'secondary' | 'default' | 'outline' | 'destructive' || 'secondary';

  const timeRemaining = formatTimeRemaining(progress.estimated_completion_at);
  const processingRateStr = formatProcessingRate(progress.processing_rate);
  const hasChunkDetails = progress.chunk_details && progress.chunk_details.length > 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-4 p-3">
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium capitalize">{progress.sync_type}</span>
            <Badge variant={statusVariant} className="text-xs">
              {progress.status}
            </Badge>
            {progress.failed_chunks > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {progress.failed_chunks} failed
              </Badge>
            )}
          </div>
          
          {/* Current operation display */}
          {progress.status === 'running' && progress.current_operation && (
            <p className="text-xs text-muted-foreground mb-1">
              {progress.current_operation}
              {progress.current_resource_name && (
                <span className="font-medium"> - {progress.current_resource_name}</span>
              )}
            </p>
          )}
          
          {progress.status === 'running' && (
            <Progress value={percentComplete} className="h-2" />
          )}
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
            <span>{progress.records_synced.toLocaleString()} records synced</span>
            <span>{progress.completed_chunks}/{progress.total_chunks} chunks</span>
            {processingRateStr && <span>{processingRateStr}</span>}
            {timeRemaining && progress.status === 'running' && (
              <span className="text-primary">~{timeRemaining} remaining</span>
            )}
            {progress.start_date && progress.end_date && (
              <span>({progress.start_date} to {progress.end_date})</span>
            )}
          </div>
          
          {progress.error_message && (
            <p className="text-xs text-destructive mt-1">{progress.error_message}</p>
          )}
        </div>
      </div>
      
      {/* Expandable chunk details */}
      {hasChunkDetails && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 border-t">
              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Chunk Details ({progress.chunk_details.length})
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-1 max-h-48 overflow-y-auto">
              {progress.chunk_details.map((chunk, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs py-1">
                  <ChunkStatusIcon status={chunk.status} />
                  <span className="flex-1 truncate">{chunk.label}</span>
                  {chunk.status === 'completed' && (
                    <span className="text-muted-foreground">
                      {chunk.records.toLocaleString()} records
                    </span>
                  )}
                  {chunk.status === 'failed' && chunk.error && (
                    <span className="text-destructive truncate max-w-[200px]" title={chunk.error}>
                      {chunk.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export function AzureHistoricalSync() {
  const { data: tenants = [] } = useAzureTenants();
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  
  // Cost sync state
  const [costStartDate, setCostStartDate] = useState<Date>(() => startOfMonth(subMonths(new Date(), 3)));
  const [costEndDate, setCostEndDate] = useState<Date>(new Date());
  
  // Metrics sync state
  const [metricsDays, setMetricsDays] = useState<string>('30');
  
  // SQL insights sync state
  const [sqlDays, setSqlDays] = useState<string>('7');

  const { data: syncProgress = [] } = useAzureSyncProgress(selectedTenantId);
  const startCostSync = useStartHistoricalCostSync();
  const startMetricsSync = useStartHistoricalMetricsSync();
  const startSqlInsightsSync = useStartHistoricalSqlInsightsSync();

  const hasActiveSync = syncProgress.some(p => p.status === 'running' || p.status === 'pending');

  const handleStartCostSync = async () => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }

    try {
      await startCostSync.mutateAsync({
        tenantId: selectedTenantId,
        startDate: format(costStartDate, 'yyyy-MM-dd'),
        endDate: format(costEndDate, 'yyyy-MM-dd'),
      });
      toast.success('Historical cost sync started');
    } catch (error) {
      toast.error(`Failed to start cost sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStartMetricsSync = async () => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }

    try {
      await startMetricsSync.mutateAsync({
        tenantId: selectedTenantId,
        days: parseInt(metricsDays),
      });
      toast.success('Historical metrics sync started');
    } catch (error) {
      toast.error(`Failed to start metrics sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStartSqlInsightsSync = async () => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant');
      return;
    }

    try {
      await startSqlInsightsSync.mutateAsync({
        tenantId: selectedTenantId,
        days: parseInt(sqlDays),
      });
      toast.success('Historical SQL insights sync started');
    } catch (error) {
      toast.error(`Failed to start SQL insights sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const setCostPreset = (months: number) => {
    setCostStartDate(startOfMonth(subMonths(new Date(), months)));
    setCostEndDate(new Date());
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Historical Data Sync</h2>
        <p className="text-sm text-muted-foreground">
          Load historical Azure data for cost analysis and performance metrics.
        </p>
      </div>

      {/* Tenant Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Select Tenant</label>
        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select a tenant" />
          </SelectTrigger>
          <SelectContent>
            {tenants.filter(t => t.is_enabled).map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTenantId && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Cost Data Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cost Data
              </CardTitle>
              <CardDescription>
                Sync up to 13 months of historical cost data from Azure Cost Management API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setCostPreset(3)}>
                  Last 3 months
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCostPreset(6)}>
                  Last 6 months
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCostPreset(12)}>
                  Last 12 months
                </Button>
              </div>

              {/* Date Range */}
              <div className="flex flex-wrap gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[160px] justify-start text-left font-normal",
                          !costStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {costStartDate ? format(costStartDate, "MMM d, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={costStartDate}
                        onSelect={(date) => date && setCostStartDate(date)}
                        disabled={(date) => date > new Date() || date < subMonths(new Date(), 13)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">End Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[160px] justify-start text-left font-normal",
                          !costEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {costEndDate ? format(costEndDate, "MMM d, yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={costEndDate}
                        onSelect={(date) => date && setCostEndDate(date)}
                        disabled={(date) => date > new Date() || date < costStartDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button 
                onClick={handleStartCostSync} 
                disabled={hasActiveSync || startCostSync.isPending}
                className="w-full"
              >
                {startCostSync.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Cost Sync
              </Button>
            </CardContent>
          </Card>

          {/* Metrics Data Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>
                Sync up to 93 days of historical performance metrics from Azure Monitor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={metricsDays === '7' ? 'secondary' : 'outline'} 
                  size="sm" 
                  onClick={() => setMetricsDays('7')}
                >
                  Last 7 days
                </Button>
                <Button 
                  variant={metricsDays === '30' ? 'secondary' : 'outline'} 
                  size="sm" 
                  onClick={() => setMetricsDays('30')}
                >
                  Last 30 days
                </Button>
                <Button 
                  variant={metricsDays === '60' ? 'secondary' : 'outline'} 
                  size="sm" 
                  onClick={() => setMetricsDays('60')}
                >
                  Last 60 days
                </Button>
                <Button 
                  variant={metricsDays === '90' ? 'secondary' : 'outline'} 
                  size="sm" 
                  onClick={() => setMetricsDays('90')}
                >
                  Last 90 days
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Selected: <span className="font-medium">{metricsDays} days</span> of historical data
              </div>

              <Button 
                onClick={handleStartMetricsSync} 
                disabled={hasActiveSync || startMetricsSync.isPending}
                className="w-full"
              >
                {startMetricsSync.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Metrics Sync
              </Button>
            </CardContent>
          </Card>

          {/* SQL Insights Data Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DatabaseZap className="h-5 w-5" />
                SQL Insights
              </CardTitle>
              <CardDescription>
                Sync wait stats and query performance from Log Analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={sqlDays === '1' ? 'secondary' : 'outline'} 
                  size="sm" 
                  onClick={() => setSqlDays('1')}
                >
                  Last 24 hours
                </Button>
                <Button 
                  variant={sqlDays === '7' ? 'secondary' : 'outline'} 
                  size="sm" 
                  onClick={() => setSqlDays('7')}
                >
                  Last 7 days
                </Button>
                <Button 
                  variant={sqlDays === '14' ? 'secondary' : 'outline'} 
                  size="sm" 
                  onClick={() => setSqlDays('14')}
                >
                  Last 14 days
                </Button>
                <Button 
                  variant={sqlDays === '30' ? 'secondary' : 'outline'} 
                  size="sm" 
                  onClick={() => setSqlDays('30')}
                >
                  Last 30 days
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Selected: <span className="font-medium">{sqlDays} day{parseInt(sqlDays) > 1 ? 's' : ''}</span> of historical data
              </div>

              <p className="text-xs text-muted-foreground">
                Requires Log Analytics workspace configured with SQL diagnostics enabled.
              </p>

              <Button 
                onClick={handleStartSqlInsightsSync} 
                disabled={hasActiveSync || startSqlInsightsSync.isPending}
                className="w-full"
              >
                {startSqlInsightsSync.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start SQL Insights Sync
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Progress */}
      {selectedTenantId && syncProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Jobs</CardTitle>
            <CardDescription>
              Track the progress of your historical data syncs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {syncProgress.map((progress) => (
              <SyncProgressCard key={progress.id} progress={progress} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Info about limits */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <h4 className="font-medium mb-2">Azure API Limits</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Cost Data:</strong> Up to 13 months of historical data (Azure Cost Management API limit)</li>
            <li>• <strong>Metrics:</strong> Up to 93 days of historical data (Azure Monitor API limit)</li>
            <li>• <strong>SQL Insights:</strong> Up to 31 days by default (Log Analytics retention). Includes wait stats, query performance, and recommendations.</li>
            <li>• <strong>Log Analytics:</strong> Data retention depends on workspace configuration (default 31 days, max 730 days)</li>
            <li>• Large date ranges are automatically chunked to avoid API timeouts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
