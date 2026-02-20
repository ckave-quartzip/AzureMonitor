import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { usePerformanceTrends } from '@/hooks/usePerformanceTrends';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { TrendingUp, Clock } from 'lucide-react';

export function ResponseTimeTrendChart() {
  const [hours, setHours] = useState(24);
  const { data, isLoading } = usePerformanceTrends(hours);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Response Time Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Response Time Trends
        </CardTitle>
        <Select value={hours.toString()} onValueChange={(v) => setHours(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 1h</SelectItem>
            <SelectItem value="6">Last 6h</SelectItem>
            <SelectItem value="24">Last 24h</SelectItem>
            <SelectItem value="72">Last 3d</SelectItem>
            <SelectItem value="168">Last 7d</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No response time data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
                label={{ value: 'ms', angle: -90, position: 'insideLeft', className: 'fill-muted-foreground' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgResponseTime" 
                name="Avg Response" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="maxResponseTime" 
                name="Max Response" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function UptimeTrendChart() {
  const [hours, setHours] = useState(24);
  const { data, isLoading } = usePerformanceTrends(hours);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Uptime Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Uptime Trend
        </CardTitle>
        <Select value={hours.toString()} onValueChange={(v) => setHours(Number(v))}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 1h</SelectItem>
            <SelectItem value="6">Last 6h</SelectItem>
            <SelectItem value="24">Last 24h</SelectItem>
            <SelectItem value="72">Last 3d</SelectItem>
            <SelectItem value="168">Last 7d</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {!data || data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No uptime data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                domain={[0, 100]}
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 11 }}
                label={{ value: '%', angle: -90, position: 'insideLeft', className: 'fill-muted-foreground' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Uptime']}
              />
              <defs>
                <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="uptime" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#uptimeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
