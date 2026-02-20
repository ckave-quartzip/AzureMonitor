import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface TrendDataPoint {
  time: string;
  avgResponseTime: number;
  maxResponseTime: number;
  uptime: number;
  totalChecks: number;
  successfulChecks: number;
}

export function usePerformanceTrends(hours = 24) {
  return useQuery({
    queryKey: ['performance_trends', hours],
    queryFn: async (): Promise<TrendDataPoint[]> => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('check_results')
        .select('checked_at, response_time_ms, status')
        .gte('checked_at', since)
        .order('checked_at', { ascending: true });
      
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      // Determine bucket size based on time range
      let bucketMinutes: number;
      if (hours <= 1) {
        bucketMinutes = 5; // 5-minute buckets for last hour
      } else if (hours <= 6) {
        bucketMinutes = 15; // 15-minute buckets for last 6 hours
      } else if (hours <= 24) {
        bucketMinutes = 60; // 1-hour buckets for last 24 hours
      } else if (hours <= 72) {
        bucketMinutes = 180; // 3-hour buckets for last 3 days
      } else {
        bucketMinutes = 360; // 6-hour buckets for 7+ days
      }
      
      // Group data into time buckets
      const buckets = new Map<string, { 
        responseTimes: number[]; 
        total: number; 
        successful: number;
        timestamp: Date;
      }>();
      
      data.forEach((result) => {
        const date = new Date(result.checked_at);
        // Round to bucket
        const bucketTime = new Date(
          Math.floor(date.getTime() / (bucketMinutes * 60 * 1000)) * (bucketMinutes * 60 * 1000)
        );
        const key = bucketTime.toISOString();
        
        if (!buckets.has(key)) {
          buckets.set(key, { responseTimes: [], total: 0, successful: 0, timestamp: bucketTime });
        }
        
        const bucket = buckets.get(key)!;
        bucket.total++;
        if (result.status === 'success') {
          bucket.successful++;
        }
        if (result.response_time_ms !== null) {
          bucket.responseTimes.push(result.response_time_ms);
        }
      });
      
      // Convert buckets to trend data points
      const trendData: TrendDataPoint[] = [];
      
      const sortedKeys = Array.from(buckets.keys()).sort();
      sortedKeys.forEach((key) => {
        const bucket = buckets.get(key)!;
        const responseTimes = bucket.responseTimes;
        
        const avgResponseTime = responseTimes.length > 0
          ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
          : 0;
        
        const maxResponseTime = responseTimes.length > 0
          ? Math.max(...responseTimes)
          : 0;
        
        const uptime = bucket.total > 0
          ? (bucket.successful / bucket.total) * 100
          : 100;
        
        // Format time label based on bucket size
        let timeLabel: string;
        if (bucketMinutes <= 60) {
          timeLabel = format(bucket.timestamp, 'HH:mm');
        } else if (hours <= 72) {
          timeLabel = format(bucket.timestamp, 'MMM d HH:mm');
        } else {
          timeLabel = format(bucket.timestamp, 'MMM d');
        }
        
        trendData.push({
          time: timeLabel,
          avgResponseTime,
          maxResponseTime,
          uptime: Math.round(uptime * 10) / 10,
          totalChecks: bucket.total,
          successfulChecks: bucket.successful,
        });
      });
      
      return trendData;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
