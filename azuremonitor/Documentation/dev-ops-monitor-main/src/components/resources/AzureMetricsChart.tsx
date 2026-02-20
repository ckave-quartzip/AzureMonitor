import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';
import { useResourceAzureMetrics } from '@/hooks/useResourceAzureDetails';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { format } from 'date-fns';

interface AzureMetricsChartProps {
  azureResourceId: string;
  resourceType?: string;
}

const TIME_RANGES = [
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
];

const METRIC_COLORS: Record<string, string> = {
  cpu: 'hsl(var(--chart-1))',
  dtu: 'hsl(var(--chart-2))',
  memory: 'hsl(var(--chart-3))',
  storage: 'hsl(var(--chart-4))',
  network: 'hsl(var(--chart-5))',
  default: 'hsl(var(--primary))',
};

function formatMetricName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function getMetricColor(metricName: string): string {
  const name = metricName.toLowerCase();
  if (name.includes('cpu')) return METRIC_COLORS.cpu;
  if (name.includes('dtu')) return METRIC_COLORS.dtu;
  if (name.includes('memory')) return METRIC_COLORS.memory;
  if (name.includes('storage')) return METRIC_COLORS.storage;
  if (name.includes('network')) return METRIC_COLORS.network;
  return METRIC_COLORS.default;
}

export function AzureMetricsChart({ azureResourceId, resourceType }: AzureMetricsChartProps) {
  const [selectedRange, setSelectedRange] = useState(24);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const { data: metricsData, isLoading } = useResourceAzureMetrics(azureResourceId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  const metricNames = Object.keys(metricsData || {});
  
  if (metricNames.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Azure Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No metrics available for this resource</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Auto-select first 3 metrics if none selected
  const activeMetrics = selectedMetrics.length > 0 
    ? selectedMetrics 
    : metricNames.slice(0, 3);

  // Build combined chart data
  const cutoffTime = new Date(Date.now() - selectedRange * 60 * 60 * 1000);
  const allTimestamps = new Set<string>();
  
  activeMetrics.forEach(metricName => {
    const metrics = metricsData?.[metricName] || [];
    metrics.forEach(m => {
      if (new Date(m.timestamp_utc) >= cutoffTime) {
        allTimestamps.add(m.timestamp_utc);
      }
    });
  });

  const sortedTimestamps = Array.from(allTimestamps).sort();
  
  const chartData = sortedTimestamps.map(timestamp => {
    const dataPoint: Record<string, any> = {
      time: timestamp,
      formattedTime: format(new Date(timestamp), selectedRange <= 24 ? 'HH:mm' : 'MMM dd HH:mm'),
    };
    
    activeMetrics.forEach(metricName => {
      const metrics = metricsData?.[metricName] || [];
      const metric = metrics.find(m => m.timestamp_utc === timestamp);
      dataPoint[metricName] = metric?.average ?? metric?.total ?? null;
    });
    
    return dataPoint;
  });

  // Limit data points for performance
  const maxPoints = 100;
  const step = Math.max(1, Math.floor(chartData.length / maxPoints));
  const displayData = chartData.filter((_, i) => i % step === 0);

  const toggleMetric = (metricName: string) => {
    if (selectedMetrics.includes(metricName)) {
      setSelectedMetrics(selectedMetrics.filter(m => m !== metricName));
    } else {
      setSelectedMetrics([...selectedMetrics, metricName]);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Azure Metrics
          </CardTitle>
          <div className="flex items-center gap-2">
            {TIME_RANGES.map(range => (
              <Button
                key={range.hours}
                variant={selectedRange === range.hours ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRange(range.hours)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {metricNames.slice(0, 8).map(name => (
            <Badge
              key={name}
              variant={activeMetrics.includes(name) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => toggleMetric(name)}
              style={{
                backgroundColor: activeMetrics.includes(name) ? getMetricColor(name) : undefined,
                borderColor: getMetricColor(name),
              }}
            >
              {formatMetricName(name)}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="formattedTime" 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                tickFormatter={(value) => {
                  if (value > 1000000) return `${(value / 1000000).toFixed(0)}M`;
                  if (value > 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toFixed(0);
                }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(label) => label}
                formatter={(value: number, name: string) => [
                  value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '--',
                  formatMetricName(name),
                ]}
              />
              <Legend 
                formatter={(value) => formatMetricName(value)}
                wrapperStyle={{ fontSize: '12px' }}
              />
              {activeMetrics.map(metricName => (
                <Line
                  key={metricName}
                  type="monotone"
                  dataKey={metricName}
                  stroke={getMetricColor(metricName)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
