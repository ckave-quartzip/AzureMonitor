import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Database, 
  Activity, 
  DollarSign, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAzureCriticalAlerts } from '@/hooks/useAzureCriticalAlerts';

function getSeverityColor(severity: 'healthy' | 'warning' | 'critical') {
  switch (severity) {
    case 'critical':
      return 'text-destructive';
    case 'warning':
      return 'text-amber-500';
    default:
      return 'text-emerald-500';
  }
}

function getScoreColor(score: number) {
  if (score >= 90) return 'text-emerald-500';
  if (score >= 70) return 'text-amber-500';
  return 'text-destructive';
}

function getScoreBorder(score: number) {
  if (score >= 90) return '';
  if (score >= 70) return 'border-amber-500/50';
  return 'border-destructive/50';
}

function formatCurrency(value: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CriticalAzureAlerts() {
  const { data, isLoading, error } = useAzureCriticalAlerts();

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Azure Health Summary
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }

  if (error || !data || !data.hasData) {
    return null;
  }

  const { 
    sqlHealthScore, 
    sqlDatabaseCount,
    sqlIssues, 
    performance, 
    costAlerts, 
    underutilized, 
    overallSeverity,
    totalIssues,
  } = data;

  // Don't show if everything is healthy
  const showCriticalBanner = overallSeverity === 'critical';

  return (
    <div className="mb-8">
      {/* Critical Alert Banner */}
      {showCriticalBanner && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {totalIssues} critical Azure issue{totalIssues !== 1 ? 's' : ''} require{totalIssues === 1 ? 's' : ''} attention
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Azure Health Summary
        </h2>
        <Link 
          to="/azure/health" 
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          View All Issues <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* SQL Health Card */}
        <Card className={getScoreBorder(sqlHealthScore)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SQL Health</CardTitle>
            <Database className={`h-4 w-4 ${getScoreColor(sqlHealthScore)}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(sqlHealthScore)}`}>
              {sqlHealthScore}%
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {sqlDatabaseCount} database{sqlDatabaseCount !== 1 ? 's' : ''} monitored
            </p>
            <div className="space-y-1 text-xs">
              {sqlIssues.deadlocks > 0 && (
                <div className="flex items-center gap-1 text-destructive">
                  <span>• {sqlIssues.deadlocks} deadlock{sqlIssues.deadlocks !== 1 ? 's' : ''}</span>
                </div>
              )}
              {sqlIssues.blocked > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <span>• {sqlIssues.blocked} blocked process{sqlIssues.blocked !== 1 ? 'es' : ''}</span>
                </div>
              )}
              {sqlIssues.highDtu > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <span>• {sqlIssues.highDtu} high DTU</span>
                </div>
              )}
              {sqlIssues.missingIndexes > 0 && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span>• {sqlIssues.missingIndexes} missing index{sqlIssues.missingIndexes !== 1 ? 'es' : ''}</span>
                </div>
              )}
              {sqlHealthScore >= 90 && sqlIssues.deadlocks === 0 && sqlIssues.blocked === 0 && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>All healthy</span>
                </div>
              )}
            </div>
            <Link 
              to="/azure/health?section=sql" 
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              View SQL Details →
            </Link>
          </CardContent>
        </Card>

        {/* Performance Card */}
        <Card className={performance.criticalCount > 0 ? 'border-destructive/50' : performance.highCpuCount > 0 ? 'border-amber-500/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Activity className={`h-4 w-4 ${performance.criticalCount > 0 ? 'text-destructive' : performance.highCpuCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            {performance.highCpuCount > 0 ? (
              <>
                <div className={`text-2xl font-bold ${performance.criticalCount > 0 ? 'text-destructive' : 'text-amber-500'}`}>
                  {performance.highCpuCount}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  High utilization (&gt;80%)
                </p>
                <div className="space-y-1 text-xs">
                  {performance.resources.slice(0, 3).map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="truncate text-muted-foreground">{r.name}</span>
                      <Badge variant="secondary" className={r.value > 90 ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-700'}>
                        {Math.round(r.value)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-500">
                  <CheckCircle className="h-6 w-6 inline" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  All resources healthy
                </p>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>No high utilization detected</span>
                </div>
              </>
            )}
            <Link 
              to="/azure/health?section=performance" 
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              View Performance →
            </Link>
          </CardContent>
        </Card>

        {/* Cost Alerts Card */}
        <Card className={costAlerts.criticalCount > 0 ? 'border-destructive/50' : costAlerts.activeCount > 0 ? 'border-amber-500/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cost Alerts</CardTitle>
            <DollarSign className={`h-4 w-4 ${costAlerts.criticalCount > 0 ? 'text-destructive' : costAlerts.activeCount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            {costAlerts.activeCount > 0 ? (
              <>
                <div className={`text-2xl font-bold ${costAlerts.criticalCount > 0 ? 'text-destructive' : 'text-amber-500'}`}>
                  {costAlerts.activeCount}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Active cost alert{costAlerts.activeCount !== 1 ? 's' : ''}
                </p>
                <div className="space-y-1 text-xs">
                  {costAlerts.criticalCount > 0 && (
                    <div className="flex items-center gap-1 text-destructive">
                      <span>• {costAlerts.criticalCount} critical</span>
                    </div>
                  )}
                  {costAlerts.totalOverThreshold > 0 && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <span>• {formatCurrency(costAlerts.totalOverThreshold, costAlerts.currency)} over threshold</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-500">
                  <CheckCircle className="h-6 w-6 inline" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  No cost alerts
                </p>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Spending within thresholds</span>
                </div>
              </>
            )}
            <Link 
              to="/azure/health?section=costs" 
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              View Cost Alerts →
            </Link>
          </CardContent>
        </Card>

        {/* Underutilized Resources Card */}
        <Card className={underutilized.count > 0 ? 'border-amber-500/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Underutilized</CardTitle>
            <TrendingDown className={`h-4 w-4 ${underutilized.count > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            {underutilized.count > 0 ? (
              <>
                <div className="text-2xl font-bold text-amber-500">
                  {underutilized.count}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Resource{underutilized.count !== 1 ? 's' : ''} under 20% usage
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-amber-600">
                    <span>• ~{formatCurrency(underutilized.potentialSavings, underutilized.currency)}/mo potential savings</span>
                  </div>
                  {underutilized.resources.slice(0, 2).map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span className="truncate">{r.name}</span>
                      <span>{r.avgUsage}% avg</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-500">
                  <CheckCircle className="h-6 w-6 inline" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  No underutilized resources
                </p>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Resources well utilized</span>
                </div>
              </>
            )}
            <Link 
              to="/azure/health?section=underutilized" 
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              View Underutilized →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
