import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useAzureCostSummary } from '@/hooks/useAzureCosts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface EnvironmentCostOverviewProps {
  tenantId: string;
  startDate?: string;
  endDate?: string;
}

export function EnvironmentCostOverview({ tenantId, startDate, endDate }: EnvironmentCostOverviewProps) {
  const { data: costSummary, isLoading, error } = useAzureCostSummary(tenantId, startDate, endDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (error || !costSummary) {
    return null;
  }

  // Get top 5 categories by cost
  const topCategories = Object.entries(costSummary.by_category)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Format date range for display
  const formatDateRange = () => {
    const summary = costSummary as typeof costSummary & { startDate?: string; endDate?: string };
    if (summary.startDate && summary.endDate) {
      const start = new Date(summary.startDate);
      const end = new Date(summary.endDate);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return 'Last 30 days';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          30-Day Cost Overview
        </CardTitle>
        <CardDescription>
          Azure spending: {formatDateRange()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Cost */}
          <div className="text-center py-4 bg-muted rounded-lg">
            <p className="text-3xl font-bold">
              ${costSummary.total_cost.toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </p>
            <p className="text-sm text-muted-foreground">
              30-Day Spend ({costSummary.currency})
            </p>
          </div>

          {/* Top Categories */}
          {topCategories.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Top Spending Categories</h4>
              <div className="space-y-2">
                {topCategories.map(([category, cost]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1">{category}</span>
                    <Badge variant="secondary">
                      ${cost.toLocaleString(undefined, { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                      })}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Record count */}
          <p className="text-xs text-muted-foreground text-center">
            Based on {costSummary.record_count} cost records
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
