import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Calendar, Filter, Sparkles, PiggyBank, Scale, Trash2 } from 'lucide-react';
import { CostComparisonResult } from '@/hooks/useCostComparison';

interface CostComparisonSummaryProps {
  data: CostComparisonResult;
  period1Label: string;
  period2Label: string;
}

export function CostComparisonSummary({ data, period1Label, period2Label }: CostComparisonSummaryProps) {
  const [excludeNewItems, setExcludeNewItems] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate new/removed/savings item stats from the resource breakdown
  const newItems = data.period1.byResource.filter(r => r.isNew);
  const removedItems = data.period1.byResource.filter(r => r.isRemoved);
  const savingsItems = data.period1.byResource.filter(r => r.hasSavings);
  
  const newItemsCount = newItems.length;
  const removedItemsCount = removedItems.length;
  const savingsItemsCount = savingsItems.length;
  
  const newItemsCost = newItems.reduce((sum, r) => sum + r.period1Cost, 0);
  const removedItemsCost = removedItems.reduce((sum, r) => sum + r.period2Cost, 0);
  const reducedCostSavings = savingsItems.reduce((sum, r) => sum + r.savingsAmount, 0);
  const totalSavings = removedItemsCost + reducedCostSavings;

  // Calculate adjusted values when excluding new/removed items
  const adjustedP1Total = excludeNewItems 
    ? data.period1.totalCost - newItemsCost 
    : data.period1.totalCost;
  const adjustedP2Total = excludeNewItems 
    ? data.period2.totalCost - removedItemsCost 
    : data.period2.totalCost;
  const adjustedVariance = adjustedP1Total - adjustedP2Total;
  const adjustedPercentChange = adjustedP2Total === 0 
    ? (adjustedP1Total > 0 ? 100 : 0)
    : ((adjustedP1Total - adjustedP2Total) / adjustedP2Total) * 100;
  const adjustedP1DailyAvg = adjustedP1Total / data.period1.daysInPeriod;
  const adjustedP2DailyAvg = adjustedP2Total / data.period2.daysInPeriod;

  const isPositiveChange = excludeNewItems 
    ? adjustedPercentChange > 0 
    : data.variance.percentChange > 0;

  const displayP1Total = excludeNewItems ? adjustedP1Total : data.period1.totalCost;
  const displayP2Total = excludeNewItems ? adjustedP2Total : data.period2.totalCost;
  const displayVariance = excludeNewItems ? adjustedVariance : data.variance.absoluteDiff;
  const displayPercentChange = excludeNewItems ? adjustedPercentChange : data.variance.percentChange;
  const displayP1DailyAvg = excludeNewItems ? adjustedP1DailyAvg : data.period1.dailyAverage;
  const displayP2DailyAvg = excludeNewItems ? adjustedP2DailyAvg : data.period2.dailyAverage;

  const hasNewOrRemoved = newItemsCount > 0 || removedItemsCount > 0;

  return (
    <div className="space-y-4">
      {/* Apples-to-Apples Toggle */}
      {hasNewOrRemoved && (
        <div className="flex items-center justify-end gap-3 p-3 bg-muted/30 rounded-lg border">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="exclude-new" className="text-sm cursor-pointer">
            Apples-to-apples comparison
          </Label>
          <Switch
            id="exclude-new"
            checked={excludeNewItems}
            onCheckedChange={setExcludeNewItems}
          />
          {excludeNewItems && (
            <Badge variant="secondary" className="text-xs">
              Excluding {newItemsCount} new, {removedItemsCount} removed
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Period 1 Total */}
        <Card className={excludeNewItems ? 'border-primary/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{period1Label}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayP1Total)}</div>
            <p className="text-xs text-muted-foreground">
              {data.period1.daysInPeriod} days
              {excludeNewItems && newItemsCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  (-{formatCurrency(newItemsCost)} new)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Period 2 Total */}
        <Card className={excludeNewItems ? 'border-primary/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{period2Label}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayP2Total)}</div>
            <p className="text-xs text-muted-foreground">
              {data.period2.daysInPeriod} days
              {excludeNewItems && removedItemsCount > 0 && (
                <span className="text-green-600 dark:text-green-400 ml-1">
                  (-{formatCurrency(removedItemsCost)} removed)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Variance */}
        <Card className={excludeNewItems ? 'border-primary/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Variance
              {excludeNewItems && (
                <Badge variant="outline" className="ml-2 text-xs">Adjusted</Badge>
              )}
            </CardTitle>
            {isPositiveChange ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isPositiveChange ? 'text-destructive' : 'text-green-500'}`}>
              {isPositiveChange ? '+' : ''}{formatCurrency(displayVariance)}
            </div>
            <p className={`text-xs ${isPositiveChange ? 'text-destructive' : 'text-green-500'}`}>
              {isPositiveChange ? '+' : ''}{displayPercentChange.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* Daily Average P1 */}
        <Card className={excludeNewItems ? 'border-primary/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Daily Avg (P1)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayP1DailyAvg)}</div>
            <p className="text-xs text-muted-foreground">per day</p>
          </CardContent>
        </Card>

        {/* Daily Average P2 */}
        <Card className={excludeNewItems ? 'border-primary/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Daily Avg (P2)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayP2DailyAvg)}</div>
            <p className="text-xs text-muted-foreground">per day</p>
          </CardContent>
        </Card>

        {/* Excluded Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Excluded</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {formatCurrency(data.excludedCost.period1)}
            </div>
            <p className="text-xs text-muted-foreground">
              P2: {formatCurrency(data.excludedCost.period2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New Items / Removed Items / Savings Summary Row - Always show all cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* New Items Card */}
        <Card className={`border-amber-500/30 bg-amber-500/5 ${excludeNewItems && newItemsCount > 0 ? 'opacity-60' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              New Resources
              {excludeNewItems && newItemsCount > 0 && (
                <Badge variant="outline" className="text-xs">Excluded</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <div>
                <div className={`text-2xl font-bold ${newItemsCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                  {newItemsCount}
                </div>
                <p className="text-xs text-muted-foreground">added in {period1Label}</p>
              </div>
              <div className="border-l pl-4">
                <div className={`text-xl font-semibold ${newItemsCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                  {formatCurrency(newItemsCost)}
                </div>
                <p className="text-xs text-muted-foreground">cost impact</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Removed Items Card */}
        <Card className={`border-slate-500/30 bg-slate-500/5 ${excludeNewItems && removedItemsCount > 0 ? 'opacity-60' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              Removed Resources
              {excludeNewItems && removedItemsCount > 0 && (
                <Badge variant="outline" className="text-xs">Excluded</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <div>
                <div className={`text-2xl font-bold ${removedItemsCount > 0 ? 'text-slate-700 dark:text-slate-400' : 'text-muted-foreground'}`}>
                  {removedItemsCount}
                </div>
                <p className="text-xs text-muted-foreground">discontinued</p>
              </div>
              <div className="border-l pl-4">
                <div className={`text-xl font-semibold ${removedItemsCount > 0 ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                  -{formatCurrency(removedItemsCost)}
                </div>
                <p className="text-xs text-muted-foreground">saved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Savings Card */}
        <Card className={`border-green-500/30 ${totalSavings > 0 ? 'bg-green-500/5' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-green-600 dark:text-green-400" />
              Total Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4 flex-wrap">
              <div>
                <div className={`text-2xl font-bold ${totalSavings > 0 ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {formatCurrency(totalSavings)}
                </div>
                <p className="text-xs text-muted-foreground">total saved</p>
              </div>
              {savingsItemsCount > 0 && reducedCostSavings > 0 && (
                <div className="border-l pl-4">
                  <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                    {savingsItemsCount} reduced
                  </div>
                  <p className="text-xs text-muted-foreground">{formatCurrency(reducedCostSavings)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
