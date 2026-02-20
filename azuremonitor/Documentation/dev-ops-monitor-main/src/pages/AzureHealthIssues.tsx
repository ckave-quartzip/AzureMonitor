import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Database,
  Activity,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Minus,
  ChevronDown,
  ChevronRight,
  Settings2,
  Cpu,
  HardDrive,
  MemoryStick,
  Gauge,
  Lightbulb,
  ArrowDownToLine,
  Power,
  Calendar,
  Zap,
} from 'lucide-react';
import { useAzureHealthDetails, DEFAULT_THRESHOLDS, UnderutilizationThresholds, RightsizingRecommendation } from '@/hooks/useAzureHealthDetails';
import { format } from 'date-fns';

function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getSeverityBadge(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical':
      return <Badge variant="destructive">Critical</Badge>;
    case 'high':
      return <Badge className="bg-destructive/80">High</Badge>;
    case 'warning':
      return <Badge className="bg-amber-500">Warning</Badge>;
    default:
      return <Badge variant="secondary">{severity}</Badge>;
  }
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-destructive" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-emerald-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function getRecommendationIcon(type: RightsizingRecommendation['type']) {
  switch (type) {
    case 'downsize':
      return <ArrowDownToLine className="h-4 w-4" />;
    case 'deallocate':
      return <Power className="h-4 w-4" />;
    case 'reserved':
      return <Calendar className="h-4 w-4" />;
    case 'spot':
      return <Zap className="h-4 w-4" />;
    default:
      return <Lightbulb className="h-4 w-4" />;
  }
}

function getConfidenceBadge(confidence: 'high' | 'medium' | 'low') {
  switch (confidence) {
    case 'high':
      return <Badge className="bg-emerald-500">High Confidence</Badge>;
    case 'medium':
      return <Badge className="bg-amber-500">Medium</Badge>;
    case 'low':
      return <Badge variant="outline">Low</Badge>;
  }
}

function MetricBar({ value, threshold, label, icon }: { value: number; threshold: number; label: string; icon: React.ReactNode }) {
  const isUnderutilized = value < threshold;
  const percentage = Math.min(100, value);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-muted-foreground">{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${isUnderutilized ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <span className={`text-xs font-medium w-10 text-right ${isUnderutilized ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {value.toFixed(0)}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}: {value.toFixed(1)}% avg (threshold: {threshold}%)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function AzureHealthIssues() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const section = searchParams.get('section') || 'sql';
  
  // Configurable thresholds state
  const [thresholds, setThresholds] = useState<UnderutilizationThresholds>(DEFAULT_THRESHOLDS);
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());
  
  const { data, isLoading, error, refetch, isRefetching } = useAzureHealthDetails(thresholds);

  const sqlRef = useRef<HTMLDivElement>(null);
  const performanceRef = useRef<HTMLDivElement>(null);
  const costsRef = useRef<HTMLDivElement>(null);
  const underutilizedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to section when URL param changes
  useEffect(() => {
    const refs: Record<string, React.RefObject<HTMLDivElement>> = {
      sql: sqlRef,
      performance: performanceRef,
      costs: costsRef,
      underutilized: underutilizedRef,
    };
    
    const ref = refs[section];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [section, data]);

  const toggleResourceExpanded = (resourceId: string) => {
    setExpandedResources(prev => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load Azure health details. Please try again.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  const { sql, performance, costAlerts, underutilized, underutilizationStats, summary } = data;
  const totalIssues = summary.sqlIssueCount + summary.performanceIssueCount + summary.costAlertCount + summary.underutilizedCount;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Azure Health Issues</h1>
          <p className="text-muted-foreground">
            {totalIssues === 0 
              ? 'All systems are healthy' 
              : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} require attention`
            }
          </p>
        </div>

        {/* Overall severity banner */}
        {summary.overallSeverity === 'critical' && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Critical issues detected that require immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs value={section} onValueChange={(v) => navigate(`/azure/health?section=${v}`)}>
          <TabsList className="mb-6">
            <TabsTrigger value="sql" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              SQL Issues
              {summary.sqlIssueCount > 0 && (
                <Badge variant="secondary" className="ml-1">{summary.sqlIssueCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance
              {summary.performanceIssueCount > 0 && (
                <Badge variant="secondary" className="ml-1">{summary.performanceIssueCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="costs" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Cost Alerts
              {summary.costAlertCount > 0 && (
                <Badge variant="secondary" className="ml-1">{summary.costAlertCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="underutilized" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Underutilized
              {summary.underutilizedCount > 0 && (
                <Badge variant="secondary" className="ml-1">{summary.underutilizedCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* SQL Issues Tab */}
          <TabsContent value="sql" ref={sqlRef}>
            <div className="space-y-6">
              {/* Deadlocks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Deadlocks
                    {sql.deadlocks.length > 0 && (
                      <Badge variant="destructive">{sql.deadlocks.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Database deadlocks detected in the last sync period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sql.deadlocks.length === 0 ? (
                    <EmptyState title="No Deadlocks" description="No deadlocks detected in your databases." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Database</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>Last Occurred</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sql.deadlocks.map((item) => (
                          <TableRow key={item.resourceId}>
                            <TableCell className="font-medium">{item.resourceName}</TableCell>
                            <TableCell>
                              <Badge variant="destructive">{item.count}</Badge>
                            </TableCell>
                            <TableCell>{format(new Date(item.lastOccurred), 'MMM d, h:mm a')}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/azure/resources/${item.resourceId}`}>
                                  View <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Blocked Processes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Blocked Processes
                    {sql.blocked.length > 0 && (
                      <Badge className="bg-amber-500">{sql.blocked.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Databases with blocked processes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sql.blocked.length === 0 ? (
                    <EmptyState title="No Blocked Processes" description="No blocked processes detected." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Database</TableHead>
                          <TableHead>Blocked Count</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sql.blocked.map((item) => (
                          <TableRow key={item.resourceId}>
                            <TableCell className="font-medium">{item.resourceName}</TableCell>
                            <TableCell>
                              <Badge className="bg-amber-500">{item.count}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/azure/resources/${item.resourceId}`}>
                                  View <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* High DTU/CPU */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    High DTU/CPU Usage
                    {sql.highDtu.length > 0 && (
                      <Badge className="bg-amber-500">{sql.highDtu.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Databases with DTU or CPU usage above 80%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sql.highDtu.length === 0 ? (
                    <EmptyState title="No High Usage" description="All databases are within normal usage limits." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Database</TableHead>
                          <TableHead>DTU %</TableHead>
                          <TableHead>CPU %</TableHead>
                          <TableHead>Storage %</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sql.highDtu.map((item) => (
                          <TableRow key={item.resourceId}>
                            <TableCell className="font-medium">{item.resourceName}</TableCell>
                            <TableCell>
                              <Badge variant={item.dtuPercent > 90 ? 'destructive' : 'secondary'}>
                                {Math.round(item.dtuPercent)}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.cpuPercent > 90 ? 'destructive' : 'secondary'}>
                                {Math.round(item.cpuPercent)}%
                              </Badge>
                            </TableCell>
                            <TableCell>{Math.round(item.storagePercent)}%</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/azure/resources/${item.resourceId}`}>
                                  View <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Missing Indexes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Missing Indexes
                    {sql.missingIndexes.length > 0 && (
                      <Badge variant="secondary">{sql.missingIndexes.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Recommended indexes to improve query performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sql.missingIndexes.length === 0 ? (
                    <EmptyState title="No Missing Indexes" description="No index recommendations at this time." />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Database</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Impact</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sql.missingIndexes.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.resourceName}</TableCell>
                            <TableCell>{item.tableName}</TableCell>
                            <TableCell>{getSeverityBadge(item.impact)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/azure/resources/${item.resourceId}`}>
                                  View <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" ref={performanceRef}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  High CPU/DTU Resources
                  {performance.highCpu.length > 0 && (
                    <Badge className="bg-amber-500">{performance.highCpu.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Resources with CPU or DTU usage above 80%
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performance.highCpu.length === 0 ? (
                  <EmptyState title="No Performance Issues" description="All resources are operating within normal parameters." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Resource</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Metric</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performance.highCpu.map((item) => (
                        <TableRow key={item.resourceId}>
                          <TableCell className="font-medium">{item.resourceName}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {item.resourceType.split('/').pop()}
                          </TableCell>
                          <TableCell>{item.metric}</TableCell>
                          <TableCell>
                            <Badge variant={item.value > 90 ? 'destructive' : 'secondary'}>
                              {Math.round(item.value)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TrendIcon trend={item.trend} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{item.location}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/azure/resources/${item.resourceId}`}>
                                View <ExternalLink className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cost Alerts Tab */}
          <TabsContent value="costs" ref={costsRef}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Active Cost Alerts
                  {costAlerts.active.length > 0 && (
                    <Badge variant="destructive">{costAlerts.active.length}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Cost thresholds that have been exceeded
                </CardDescription>
              </CardHeader>
              <CardContent>
                {costAlerts.active.length === 0 ? (
                  <EmptyState title="No Cost Alerts" description="All spending is within configured thresholds." />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alert Rule</TableHead>
                        <TableHead>Resource Group</TableHead>
                        <TableHead>Threshold</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Triggered</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costAlerts.active.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell className="font-medium">{alert.ruleName}</TableCell>
                          <TableCell>{alert.resourceGroup || '-'}</TableCell>
                          <TableCell>{formatCurrency(alert.threshold)}</TableCell>
                          <TableCell className="text-destructive font-medium">
                            {formatCurrency(alert.current)}
                          </TableCell>
                          <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                          <TableCell>{format(new Date(alert.triggeredAt), 'MMM d, h:mm a')}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to="/alerts?tab=cost">
                                View <ExternalLink className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Underutilized Tab - Enhanced */}
          <TabsContent value="underutilized" ref={underutilizedRef}>
            <div className="space-y-6">
              {/* Threshold Settings */}
              <Card>
                <Collapsible open={showThresholdSettings} onOpenChange={setShowThresholdSettings}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Detection Thresholds
                        {showThresholdSettings ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
                      </CardTitle>
                      <CardDescription>
                        Configure when resources are considered underutilized
                      </CardDescription>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Cpu className="h-4 w-4" />
                            CPU Threshold: {thresholds.cpu}%
                          </Label>
                          <Slider
                            value={[thresholds.cpu]}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, cpu: v }))}
                            min={5}
                            max={50}
                            step={5}
                          />
                          <p className="text-xs text-muted-foreground">Resources with avg CPU below this are flagged</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <MemoryStick className="h-4 w-4" />
                            Memory Threshold: {thresholds.memory}%
                          </Label>
                          <Slider
                            value={[thresholds.memory]}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, memory: v }))}
                            min={10}
                            max={60}
                            step={5}
                          />
                          <p className="text-xs text-muted-foreground">Resources with avg memory below this are flagged</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Gauge className="h-4 w-4" />
                            DTU Threshold: {thresholds.dtu}%
                          </Label>
                          <Slider
                            value={[thresholds.dtu]}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, dtu: v }))}
                            min={5}
                            max={50}
                            step={5}
                          />
                          <p className="text-xs text-muted-foreground">SQL databases with avg DTU below this are flagged</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            Storage Threshold: {thresholds.storage}%
                          </Label>
                          <Slider
                            value={[thresholds.storage]}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, storage: v }))}
                            min={20}
                            max={80}
                            step={5}
                          />
                          <p className="text-xs text-muted-foreground">Resources with storage usage below this are flagged</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Min Monthly Cost: ${thresholds.minMonthlyCost}
                          </Label>
                          <Slider
                            value={[thresholds.minMonthlyCost]}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, minMonthlyCost: v }))}
                            min={0}
                            max={500}
                            step={25}
                          />
                          <p className="text-xs text-muted-foreground">Only analyze resources above this cost</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Lookback Days: {thresholds.lookbackDays}
                          </Label>
                          <Slider
                            value={[thresholds.lookbackDays]}
                            onValueChange={([v]) => setThresholds(t => ({ ...t, lookbackDays: v }))}
                            min={1}
                            max={30}
                            step={1}
                          />
                          <p className="text-xs text-muted-foreground">Days of metric history to analyze</p>
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        <Button variant="outline" size="sm" onClick={() => setThresholds(DEFAULT_THRESHOLDS)}>
                          Reset to Defaults
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>

              {/* Summary Stats */}
              {underutilized.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{underutilizationStats.totalResources}</div>
                      <p className="text-sm text-muted-foreground">Underutilized Resources</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{formatCurrency(underutilizationStats.totalMonthlyCost)}</div>
                      <p className="text-sm text-muted-foreground">Total Monthly Cost</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-amber-600">{formatCurrency(underutilizationStats.totalPotentialSavings)}</div>
                      <p className="text-sm text-muted-foreground">Potential Monthly Savings</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-1">
                        {Object.entries(underutilizationStats.byRecommendationType).map(([type, data]) => (
                          <div key={type} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{type}</span>
                            <span className="text-muted-foreground">{data.count} resources</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">Recommendation Types</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Underutilized Resources List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Underutilized Resources
                    {underutilized.length > 0 && (
                      <Badge className="bg-amber-500">{underutilized.length}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Resources with utilization below configured thresholds across multiple metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {underutilized.length === 0 ? (
                    <EmptyState 
                      title="No Underutilized Resources" 
                      description="All monitored resources are being utilized efficiently based on current thresholds." 
                    />
                  ) : (
                    <div className="space-y-4">
                      {underutilized.map((item) => (
                        <Collapsible 
                          key={item.resourceId} 
                          open={expandedResources.has(item.resourceId)}
                          onOpenChange={() => toggleResourceExpanded(item.resourceId)}
                        >
                          <div className="border rounded-lg overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    {expandedResources.has(item.resourceId) 
                                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    }
                                    <div>
                                      <div className="font-medium">{item.resourceName}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {item.resourceType.split('/').pop()} • {item.resourceGroup} • {item.location}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    {/* Metric bars preview */}
                                    <div className="hidden md:flex gap-4 w-48">
                                      {item.metrics.cpu && (
                                        <MetricBar 
                                          value={item.metrics.cpu.avgValue} 
                                          threshold={thresholds.cpu} 
                                          label="CPU"
                                          icon={<Cpu className="h-3 w-3" />}
                                        />
                                      )}
                                      {item.metrics.dtu && (
                                        <MetricBar 
                                          value={item.metrics.dtu.avgValue} 
                                          threshold={thresholds.dtu} 
                                          label="DTU"
                                          icon={<Gauge className="h-3 w-3" />}
                                        />
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="font-medium">{formatCurrency(item.monthlyCost)}/mo</div>
                                      <div className="text-sm text-amber-600">
                                        Save ~{formatCurrency(item.potentialSavings)}
                                      </div>
                                    </div>
                                    <Badge variant="outline">
                                      {item.thresholdAnalysis.metricsBelowThreshold}/{item.thresholdAnalysis.metricsAnalyzed} low
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <div className="border-t bg-muted/30 p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Metrics Detail */}
                                  <div>
                                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                      <Activity className="h-4 w-4" />
                                      Resource Metrics (7-day avg)
                                    </h4>
                                    <div className="space-y-3">
                                      {item.metrics.cpu && (
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-2 text-sm">
                                            <Cpu className="h-4 w-4 text-muted-foreground" />
                                            CPU
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Badge variant={item.thresholdAnalysis.cpuUnderutilized ? 'outline' : 'secondary'} 
                                                   className={item.thresholdAnalysis.cpuUnderutilized ? 'text-amber-600 border-amber-500' : ''}>
                                              {item.metrics.cpu.avgValue.toFixed(1)}% avg
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                              (max: {item.metrics.cpu.maxValue.toFixed(1)}%)
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      {item.metrics.memory && (
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-2 text-sm">
                                            <MemoryStick className="h-4 w-4 text-muted-foreground" />
                                            Memory
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Badge variant={item.thresholdAnalysis.memoryUnderutilized ? 'outline' : 'secondary'}
                                                   className={item.thresholdAnalysis.memoryUnderutilized ? 'text-amber-600 border-amber-500' : ''}>
                                              {item.metrics.memory.avgValue.toFixed(1)}% avg
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                              (max: {item.metrics.memory.maxValue.toFixed(1)}%)
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      {item.metrics.dtu && (
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-2 text-sm">
                                            <Gauge className="h-4 w-4 text-muted-foreground" />
                                            DTU
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Badge variant={item.thresholdAnalysis.dtuUnderutilized ? 'outline' : 'secondary'}
                                                   className={item.thresholdAnalysis.dtuUnderutilized ? 'text-amber-600 border-amber-500' : ''}>
                                              {item.metrics.dtu.avgValue.toFixed(1)}% avg
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                              (max: {item.metrics.dtu.maxValue.toFixed(1)}%)
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                      {item.metrics.storage && (
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-2 text-sm">
                                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                                            Storage
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Badge variant={item.thresholdAnalysis.storageUnderutilized ? 'outline' : 'secondary'}
                                                   className={item.thresholdAnalysis.storageUnderutilized ? 'text-amber-600 border-amber-500' : ''}>
                                              {item.metrics.storage.avgValue.toFixed(1)}% avg
                                            </Badge>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Recommendations */}
                                  <div>
                                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                      <Lightbulb className="h-4 w-4" />
                                      Rightsizing Recommendations
                                    </h4>
                                    {item.recommendations.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">No specific recommendations available.</p>
                                    ) : (
                                      <div className="space-y-3">
                                        {item.recommendations.map((rec, idx) => (
                                          <div key={idx} className="border rounded-lg p-3 bg-background">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                              <div className="flex items-center gap-2">
                                                {getRecommendationIcon(rec.type)}
                                                <span className="font-medium text-sm">{rec.title}</span>
                                              </div>
                                              {getConfidenceBadge(rec.confidence)}
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                                            <div className="flex items-center justify-between text-sm">
                                              <span className="text-amber-600 font-medium">
                                                Save ~{formatCurrency(rec.estimatedSavings)}/mo ({rec.savingsPercent}%)
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                  <Button variant="outline" size="sm" asChild>
                                    <Link to={`/azure/resources/${item.resourceId}`}>
                                      View Resource Details
                                      <ExternalLink className="h-3 w-3 ml-1" />
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
