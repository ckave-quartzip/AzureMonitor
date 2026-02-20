import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subHours, subDays, differenceInMilliseconds, formatDistanceToNow } from 'date-fns';

export interface UptimePeriodStats {
  percentage: number;
  incidentCount: number;
  totalDowntimeMs: number;
  totalChecks: number;
  successfulChecks: number;
}

export interface ResponseTimeStats {
  avg: number;
  min: number;
  max: number;
  data: { timestamp: Date; responseTime: number }[];
}

export function useResourceMetrics(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['resource-metrics', resourceId],
    queryFn: async () => {
      if (!resourceId) throw new Error('No resource ID');

      // Get resource details
      const { data: resource, error: resourceError } = await supabase
        .from('resources')
        .select('*, clients(name), environments(name)')
        .eq('id', resourceId)
        .single();

      if (resourceError) throw resourceError;

      // Get monitoring checks for this resource
      const { data: monitoringChecks } = await supabase
        .from('monitoring_checks')
        .select('*')
        .eq('resource_id', resourceId);

      const checkIds = monitoringChecks?.map(c => c.id) || [];

      // Get all check results for calculations
      const { data: allResults } = await supabase
        .from('check_results')
        .select('*')
        .in('monitoring_check_id', checkIds.length > 0 ? checkIds : ['00000000-0000-0000-0000-000000000000'])
        .order('checked_at', { ascending: false });

      const results = allResults || [];
      const now = new Date();

      // Calculate uptime for different periods
      const calculateUptimeForPeriod = (hoursBack: number): UptimePeriodStats => {
        const cutoff = subHours(now, hoursBack);
        const periodResults = results.filter(r => new Date(r.checked_at) >= cutoff);
        const successfulChecks = periodResults.filter(r => r.status === 'success').length;
        const totalChecks = periodResults.length;
        
        // Count incidents (transitions to failure)
        let incidentCount = 0;
        let totalDowntimeMs = 0;
        let inFailure = false;
        let failureStart: Date | null = null;

        const sortedResults = [...periodResults].sort((a, b) => 
          new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime()
        );

        for (const result of sortedResults) {
          if (result.status !== 'success' && !inFailure) {
            inFailure = true;
            incidentCount++;
            failureStart = new Date(result.checked_at);
          } else if (result.status === 'success' && inFailure) {
            inFailure = false;
            if (failureStart) {
              totalDowntimeMs += differenceInMilliseconds(new Date(result.checked_at), failureStart);
            }
            failureStart = null;
          }
        }

        // If still in failure, count until now
        if (inFailure && failureStart) {
          totalDowntimeMs += differenceInMilliseconds(now, failureStart);
        }

        return {
          percentage: totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 100,
          incidentCount,
          totalDowntimeMs,
          totalChecks,
          successfulChecks,
        };
      };

      // Calculate current status duration
      let statusDuration = 'Unknown';
      let lastStatusChange: Date | null = null;
      
      if (results.length > 0) {
        const currentStatus = results[0]?.status;
        for (let i = 0; i < results.length; i++) {
          if (results[i].status !== currentStatus) {
            lastStatusChange = new Date(results[i].checked_at);
            break;
          }
        }
        
        if (lastStatusChange) {
          statusDuration = formatDistanceToNow(lastStatusChange, { addSuffix: false });
        } else if (results.length > 0) {
          // All results have same status, use oldest result
          const oldest = results[results.length - 1];
          statusDuration = formatDistanceToNow(new Date(oldest.checked_at), { addSuffix: false });
        }
      }

      // Get last check info
      const lastCheck = results[0];
      const lastCheckedAt = lastCheck ? new Date(lastCheck.checked_at) : null;
      const checkInterval = monitoringChecks?.[0]?.check_interval_seconds || 60;

      // Get 24h hourly data for bar chart
      const hourlyData: { hour: number; status: 'up' | 'down' | 'degraded' | 'unknown' }[] = [];
      for (let i = 23; i >= 0; i--) {
        const hourStart = subHours(now, i + 1);
        const hourEnd = subHours(now, i);
        const hourResults = results.filter(r => {
          const date = new Date(r.checked_at);
          return date >= hourStart && date < hourEnd;
        });
        
        if (hourResults.length === 0) {
          hourlyData.push({ hour: 23 - i, status: 'unknown' });
        } else {
          const failures = hourResults.filter(r => r.status !== 'success').length;
          const total = hourResults.length;
          const failureRate = failures / total;
          
          if (failureRate === 0) {
            hourlyData.push({ hour: 23 - i, status: 'up' });
          } else if (failureRate >= 0.5) {
            hourlyData.push({ hour: 23 - i, status: 'down' });
          } else {
            hourlyData.push({ hour: 23 - i, status: 'degraded' });
          }
        }
      }

      // Get alerts for this resource
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('resource_id', resourceId)
        .order('triggered_at', { ascending: false })
        .limit(10);

      return {
        resource,
        currentStatus: resource.status,
        statusDuration,
        lastCheckedAt,
        checkInterval,
        uptime24h: calculateUptimeForPeriod(24),
        uptime7d: calculateUptimeForPeriod(24 * 7),
        uptime30d: calculateUptimeForPeriod(24 * 30),
        uptime365d: calculateUptimeForPeriod(24 * 365),
        hourlyData,
        recentAlerts: alerts || [],
        monitoringChecks: monitoringChecks || [],
      };
    },
    enabled: !!resourceId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useResourceResponseTimes(resourceId: string | undefined, hours: number = 24) {
  return useQuery({
    queryKey: ['resource-response-times', resourceId, hours],
    queryFn: async () => {
      if (!resourceId) throw new Error('No resource ID');

      // Get monitoring checks for this resource
      const { data: monitoringChecks } = await supabase
        .from('monitoring_checks')
        .select('id')
        .eq('resource_id', resourceId);

      const checkIds = monitoringChecks?.map(c => c.id) || [];
      if (checkIds.length === 0) {
        return { avg: 0, min: 0, max: 0, data: [] };
      }

      const cutoff = subHours(new Date(), hours);

      const { data: results } = await supabase
        .from('check_results')
        .select('checked_at, response_time_ms')
        .in('monitoring_check_id', checkIds)
        .gte('checked_at', cutoff.toISOString())
        .not('response_time_ms', 'is', null)
        .order('checked_at', { ascending: true });

      const validResults = (results || []).filter(r => r.response_time_ms !== null);
      
      if (validResults.length === 0) {
        return { avg: 0, min: 0, max: 0, data: [] };
      }

      const responseTimes = validResults.map(r => r.response_time_ms!);
      const avg = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      const min = Math.min(...responseTimes);
      const max = Math.max(...responseTimes);

      const data = validResults.map(r => ({
        timestamp: new Date(r.checked_at),
        responseTime: r.response_time_ms!,
      }));

      return { avg, min, max, data };
    },
    enabled: !!resourceId,
  });
}
