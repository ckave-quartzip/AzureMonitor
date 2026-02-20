import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Database,
  Activity,
  Clock,
  RefreshCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gauge,
  Timer,
  GitBranch,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSqlHealthScore } from '@/hooks/useSqlHealthScore';
import { cn } from '@/lib/utils';

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 50) return 'text-orange-500';
  return 'text-destructive';
}

function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-destructive';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

function ScoreGauge({ score, size = 'lg' }: { score: number; size?: 'sm' | 'lg' }) {
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;
  const isLarge = size === 'lg';

  return (
    <div className={cn('relative', isLarge ? 'w-32 h-32' : 'w-16 h-16')}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/20"
        />
        {/* Score arc */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className={getScoreColor(score)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold', isLarge ? 'text-3xl' : 'text-lg', getScoreColor(score))}>
          {score}
        </span>
        {isLarge && (
          <span className="text-xs text-muted-foreground">{getScoreLabel(score)}</span>
        )}
      </div>
    </div>
  );
}

function MetricBar({ 
  label, 
  icon: Icon, 
  score, 
  details 
}: { 
  label: string; 
  icon: React.ElementType; 
  score: number; 
  details: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{label}</span>
              </div>
              <span className={cn('font-semibold', getScoreColor(score))}>{score}</span>
            </div>
            <Progress 
              value={score} 
              className="h-2"
              indicatorClassName={getScoreBgColor(score)}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          <p className="text-sm">{details}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SqlHealthScoreWidget() {
  const { data: healthScore, isLoading } = useSqlHealthScore();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!healthScore || healthScore.databaseCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-muted-foreground" />
            SQL Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No SQL databases found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { factors } = healthScore;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-5 w-5 text-primary" />
            SQL Health Score
          </CardTitle>
          {healthScore.lastUpdated && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(healthScore.lastUpdated), { addSuffix: true })}
            </div>
          )}
        </div>
        <CardDescription>
          Aggregated health across {healthScore.databaseCount} SQL database{healthScore.databaseCount !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Main score gauge */}
          <div className="flex flex-col items-center gap-2">
            <ScoreGauge score={healthScore.overallScore} />
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>{healthScore.healthyCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span>{healthScore.warningCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive" />
                <span>{healthScore.criticalCount}</span>
              </div>
            </div>
          </div>

          {/* Component scores */}
          <div className="flex-1 space-y-4">
            <MetricBar
              label="Performance"
              icon={Gauge}
              score={healthScore.performanceScore}
              details={`Avg DTU: ${factors.avgDtuPercent?.toFixed(1) || 'N/A'}% | High usage: ${factors.highDtuCount} | Deadlocks: ${factors.deadlockCount} | Blocked: ${factors.blockedCount}`}
            />
            <MetricBar
              label="Wait Stats"
              icon={Timer}
              score={healthScore.waitStatsScore}
              details={`Top wait: ${factors.topWaitType || 'None'} (${(factors.topWaitTimeMs / 1000).toFixed(1)}s)`}
            />
            <MetricBar
              label="Replication"
              icon={GitBranch}
              score={healthScore.replicationScore}
              details={`Issues: ${factors.replicationIssues} | Avg lag: ${factors.avgReplicationLag.toFixed(1)}s`}
            />
          </div>
        </div>

        {/* Alert badges for critical factors */}
        {(factors.deadlockCount > 0 || factors.replicationIssues > 0 || factors.highDtuCount > 0) && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {factors.deadlockCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {factors.deadlockCount} deadlock{factors.deadlockCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {factors.highDtuCount > 0 && (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                {factors.highDtuCount} high DTU
              </Badge>
            )}
            {factors.replicationIssues > 0 && (
              <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                {factors.replicationIssues} replication issue{factors.replicationIssues !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
