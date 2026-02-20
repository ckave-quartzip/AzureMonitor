import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAzureResourceMetrics, AzureMetric } from '@/hooks/useAzureMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity } from 'lucide-react';

interface ResourceMetricsPanelProps {
  resourceId: string;
  resourceType: string;
}

// Format metric name for display
function formatMetricName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export function ResourceMetricsPanel({ resourceId, resourceType }: ResourceMetricsPanelProps) {
  const { data: metricsData, isLoading, error } = useAzureResourceMetrics(resourceId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !metricsData || Object.keys(metricsData).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No metrics available for this resource
        </CardContent>
      </Card>
    );
  }

  const metricNames = Object.keys(metricsData);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
        <CardDescription>
          Real-time metrics from Azure Monitor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={metricNames[0]} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            {metricNames.slice(0, 6).map((name) => (
              <TabsTrigger key={name} value={name} className="text-xs">
                {formatMetricName(name)}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {metricNames.map((metricName) => {
            const metrics = metricsData[metricName] as AzureMetric[];
            const chartData = metrics
              .sort((a, b) => new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime())
              .map((m) => ({
                time: new Date(m.timestamp_utc).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }),
                value: m.average ?? m.total ?? 0,
                unit: m.unit,
              }));

            const unit = metrics[0]?.unit || '';

            return (
              <TabsContent key={metricName} value={metricName}>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        if (unit === 'Percent') return `${value.toFixed(0)}%`;
                        if (value > 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value > 1000) return `${(value / 1000).toFixed(1)}K`;
                        return value.toFixed(1);
                      }}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value: number) => [
                        unit === 'Percent' ? `${value.toFixed(2)}%` : value.toLocaleString(),
                        formatMetricName(metricName)
                      ]}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {formatMetricName(metricName)} ({unit})
                </p>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
