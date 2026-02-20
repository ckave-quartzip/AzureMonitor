import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine } from 'recharts';
import { CostComparisonResult, CostTrendPoint } from '@/hooks/useCostComparison';

interface CostComparisonChartProps {
  data: CostComparisonResult;
  period1Label: string;
  period2Label: string;
}

type ViewMode = 'overlay' | 'variance';

export function CostComparisonChart({ data, period1Label, period2Label }: CostComparisonChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overlay');

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Prepare overlay data - align by normalized day
  const overlayData = (() => {
    const maxDays = Math.max(
      data.period1.dailyCosts.length,
      data.period2.dailyCosts.length
    );

    const p1Map = new Map(data.period1.dailyCosts.map(d => [d.normalizedDay, d]));
    const p2Map = new Map(data.period2.dailyCosts.map(d => [d.normalizedDay, d]));

    const result: Array<{
      day: number;
      period1: number;
      period2: number;
      p1Date: string;
      p2Date: string;
    }> = [];

    for (let day = 1; day <= maxDays; day++) {
      const p1 = p1Map.get(day);
      const p2 = p2Map.get(day);
      result.push({
        day,
        period1: p1?.cost || 0,
        period2: p2?.cost || 0,
        p1Date: p1?.date || '',
        p2Date: p2?.date || '',
      });
    }

    return result;
  })();

  // Prepare variance data
  const varianceData = overlayData.map(d => ({
    day: d.day,
    variance: d.period1 - d.period2,
    p1Date: d.p1Date,
    p2Date: d.p2Date,
  }));

  const chartConfig = {
    period1: {
      label: period1Label,
      color: 'hsl(var(--primary))',
    },
    period2: {
      label: period2Label,
      color: 'hsl(var(--muted-foreground))',
    },
    variance: {
      label: 'Variance',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cost Comparison</CardTitle>
            <CardDescription>
              {viewMode === 'overlay' ? 'Both periods overlaid by day' : 'Daily variance (P1 - P2)'}
            </CardDescription>
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="overlay">Overlay</TabsTrigger>
              <TabsTrigger value="variance">Variance</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          {viewMode === 'overlay' ? (
            <LineChart data={overlayData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="day" 
                tickFormatter={(day) => `Day ${day}`}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={formatCurrency}
                className="text-xs"
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="font-medium">Day {data.day}</div>
                      <div className="text-sm text-muted-foreground">
                        {period1Label}: {formatCurrency(data.period1)} ({data.p1Date})
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {period2Label}: {formatCurrency(data.period2)} ({data.p2Date})
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="period1"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name={period1Label}
              />
              <Line
                type="monotone"
                dataKey="period2"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name={period2Label}
              />
              <Legend />
            </LineChart>
          ) : (
            <BarChart data={varianceData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="day" 
                tickFormatter={(day) => `Day ${day}`}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={formatCurrency}
                className="text-xs"
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const isPositive = d.variance >= 0;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="font-medium">Day {d.day}</div>
                      <div className={`text-sm ${isPositive ? 'text-destructive' : 'text-green-500'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(d.variance)}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="variance"
                fill="hsl(var(--primary))"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
