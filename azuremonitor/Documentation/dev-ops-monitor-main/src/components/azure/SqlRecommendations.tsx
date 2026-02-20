import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAzureSqlRecommendations, SqlRecommendation } from '@/hooks/useAzureSqlInsights';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface SqlRecommendationsProps {
  resourceId: string;
  tenantId: string;
}

function getImpactColor(impact: string): 'destructive' | 'default' | 'secondary' {
  switch (impact?.toLowerCase()) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'default';
    default:
      return 'secondary';
  }
}

function getImpactIcon(impact: string) {
  switch (impact?.toLowerCase()) {
    case 'high':
      return <AlertTriangle className="h-4 w-4" />;
    case 'medium':
      return <Info className="h-4 w-4" />;
    default:
      return <CheckCircle2 className="h-4 w-4" />;
  }
}

export function SqlRecommendations({ resourceId, tenantId }: SqlRecommendationsProps) {
  const { data: recommendations, isLoading, error } = useAzureSqlRecommendations(resourceId, tenantId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Azure Advisor Recommendations
        </CardTitle>
        <CardDescription>
          Performance and optimization suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!recommendations || recommendations.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
            <p className="text-muted-foreground">No recommendations at this time</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your database configuration looks good!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <Alert key={rec.id || idx} variant={rec.impact?.toLowerCase() === 'high' ? 'destructive' : 'default'}>
                <div className="flex items-start gap-2">
                  {getImpactIcon(rec.impact)}
                  <div className="flex-1">
                    <AlertTitle className="flex items-center gap-2">
                      {rec.name || rec.shortDescription?.problem || 'Recommendation'}
                      <Badge variant={getImpactColor(rec.impact)}>
                        {rec.impact || 'Info'}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                      {rec.shortDescription?.solution || rec.category}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
