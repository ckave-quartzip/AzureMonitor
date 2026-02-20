import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useResourceResponseTimes } from '@/hooks/useResourceMetrics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface ResourceResponseTimeChartProps {
  resourceId: string;
}

const TIME_RANGES = [
  { value: '1', label: 'Last hour' },
  { value: '6', label: 'Last 6 hours' },
  { value: '24', label: 'Last 24 hours' },
  { value: '72', label: 'Last 3 days' },
  { value: '168', label: 'Last 7 days' },
];

export function ResourceResponseTimeChart({ resourceId }: ResourceResponseTimeChartProps) {
  const [hours, setHours] = useState('24');
  const { data, isLoading } = useResourceResponseTimes(resourceId, parseInt(hours));

  const chartData = data?.data.map(d => ({
    time: format(d.timestamp, parseInt(hours) <= 24 ? 'HH:mm' : 'MMM d HH:mm'),
    responseTime: d.responseTime,
  })) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Response Time</CardTitle>
        <Select value={hours} onValueChange={setHours}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map(range => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No response time data available
          </div>
        ) : (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="time" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => `${value}ms`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${value}ms`, 'Response Time']}
                  />
                  <Line
                    type="monotone"
                    dataKey="responseTime"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{data?.avg || 0}ms</div>
                <div className="text-xs text-muted-foreground">Average</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">{data?.min || 0}ms</div>
                <div className="text-xs text-muted-foreground">Minimum</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{data?.max || 0}ms</div>
                <div className="text-xs text-muted-foreground">Maximum</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
