import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Gauge, 
  RefreshCw, 
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  useOptimizationSummary, 
  useLowScoreResources, 
  useRunScoreCalculation,
  getGradeFromScore,
  getGradeColor,
  getGradeBg
} from '@/hooks/useOptimizationScores';
import { toast } from '@/hooks/use-toast';

interface OptimizationScoreWidgetProps {
  tenantIds?: string[];
}

export function OptimizationScoreWidget({ tenantIds }: OptimizationScoreWidgetProps) {
  const { data: summary, isLoading: summaryLoading } = useOptimizationSummary(tenantIds);
  const { data: lowScoreResources, isLoading: resourcesLoading } = useLowScoreResources(70, tenantIds);
  const runCalculation = useRunScoreCalculation();

  const handleRunCalculation = async () => {
    try {
      const result = await runCalculation.mutateAsync(undefined);
      toast({ 
        title: 'Score calculation complete', 
        description: `Updated ${result.scoresUpdated} resource scores` 
      });
    } catch (error) {
      toast({ title: 'Calculation failed', variant: 'destructive' });
    }
  };

  if (summaryLoading || resourcesLoading) {
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

  const avgGrade = summary ? getGradeFromScore(summary.avgScore) : 'C';
  const needsAttention = summary?.needsAttention || 0;

  return (
    <Card className={needsAttention > 0 ? 'border-yellow-500/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Optimization Scores
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRunCalculation}
          disabled={runCalculation.isPending}
        >
          <RefreshCw className={`h-4 w-4 ${runCalculation.isPending ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary && summary.totalResources > 0 && (
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${getGradeBg(avgGrade)}`}>
              <span className={`text-2xl font-bold ${getGradeColor(avgGrade)}`}>
                {avgGrade}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Average Score</span>
                <span className="text-sm font-bold">{summary.avgScore}/100</span>
              </div>
              <Progress value={summary.avgScore} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">
                {summary.totalResources} resources analyzed
              </div>
            </div>
          </div>
        )}

        {summary && summary.totalResources > 0 && (
          <div className="grid grid-cols-5 gap-1 text-center">
            {(['A', 'B', 'C', 'D', 'F'] as const).map((grade) => {
              const count = summary[`grade${grade}` as keyof typeof summary] as number;
              return (
                <div key={grade} className={`p-2 rounded ${getGradeBg(grade)}`}>
                  <div className={`text-lg font-bold ${getGradeColor(grade)}`}>{count}</div>
                  <div className="text-xs text-muted-foreground">Grade {grade}</div>
                </div>
              );
            })}
          </div>
        )}

        {needsAttention > 0 && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">
                {needsAttention} resources need optimization
              </span>
            </div>
          </div>
        )}

        {lowScoreResources && lowScoreResources.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">
              Lowest Scores
            </div>
            {lowScoreResources.slice(0, 3).map((resource) => {
              const grade = getGradeFromScore(resource.optimization_score || 0);
              return (
                <Link
                  key={resource.id}
                  to={`/azure/resources/${resource.id}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className={`${getGradeBg(grade)} ${getGradeColor(grade)} border`}>
                      {grade}
                    </Badge>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{resource.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {resource.resource_type.split('/').pop()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold">{resource.optimization_score}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {(!summary || summary.totalResources === 0) && (
          <div className="text-center py-4 text-muted-foreground">
            <Gauge className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No optimization scores yet</p>
            <p className="text-xs">Run analysis to calculate resource scores</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
