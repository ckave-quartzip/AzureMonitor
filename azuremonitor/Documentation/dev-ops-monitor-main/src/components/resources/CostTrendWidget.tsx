import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useResourceAzureCost } from '@/hooks/useResourceAzureDetails';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format } from 'date-fns';

interface CostTrendWidgetProps {
  azureResourceId: string;
}

export function CostTrendWidget({ azureResourceId }: CostTrendWidgetProps) {
  const { data: costData, isLoading } = useResourceAzureCost(azureResourceId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: costData?.currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (!costData || costData.costTrend.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No cost data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate daily average
  const dailyAvg = costData.totalCost / Math.max(costData.costTrend.length, 1);
  
  // Calculate week-over-week change
  const last7Days = costData.costTrend.slice(-7);
  const prev7Days = costData.costTrend.slice(-14, -7);
  const last7Total = last7Days.reduce((s, d) => s + d.cost, 0);
  const prev7Total = prev7Days.reduce((s, d) => s + d.cost, 0);
  const weekChange = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total) * 100 : 0;

  const chartData = costData.costTrend.map(d => ({
    ...d,
    formattedDate: format(new Date(d.date), 'MMM dd'),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Trend
          </CardTitle>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Daily Avg</p>
              <p className="font-medium">{formatCurrency(dailyAvg)}</p>
            </div>
            <div className="flex items-center gap-1">
              {weekChange > 5 ? (
                <TrendingUp className="h-4 w-4 text-destructive" />
              ) : weekChange < -5 ? (
                <TrendingDown className="h-4 w-4 text-emerald-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={
                weekChange > 5 ? 'text-destructive' : 
                weekChange < -5 ? 'text-emerald-500' : 
                'text-muted-foreground'
              }>
                {weekChange > 0 ? '+' : ''}{weekChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="formattedDate" 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Cost']}
                labelFormatter={(label) => label}
              />
              <ReferenceLine 
                y={dailyAvg} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Area 
                type="monotone" 
                dataKey="cost" 
                stroke="hsl(var(--chart-1))" 
                fill="url(#costGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
