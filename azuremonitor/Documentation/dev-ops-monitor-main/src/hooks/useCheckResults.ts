import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type CheckResult = Tables<'check_results'>;

export function useCheckResults(monitoringCheckId?: string, limit = 50) {
  return useQuery({
    queryKey: ['check_results', monitoringCheckId, limit],
    queryFn: async () => {
      let query = supabase
        .from('check_results')
        .select('*, monitoring_checks(check_type, url, ip_address, port, resources(id, name, resource_type))')
        .order('checked_at', { ascending: false })
        .limit(limit);
      
      if (monitoringCheckId) {
        query = query.eq('monitoring_check_id', monitoringCheckId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

export function useRecentCheckResults(limit = 20) {
  const [results, setResults] = useState<any[]>([]);
  
  const query = useQuery({
    queryKey: ['check_results', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('check_results')
        .select('*, monitoring_checks(check_type, url, ip_address, port, resources(id, name, resource_type))')
        .order('checked_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds as fallback
  });

  useEffect(() => {
    if (query.data) {
      setResults(query.data);
    }
  }, [query.data]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('check_results_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_results',
        },
        async (payload) => {
          // Fetch the full record with relations
          const { data } = await supabase
            .from('check_results')
            .select('*, monitoring_checks(check_type, url, ip_address, port, resources(id, name, resource_type))')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            setResults((prev) => [data, ...prev.slice(0, limit - 1)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return { ...query, data: results };
}

export function useResourceHealthStats() {
  return useQuery({
    queryKey: ['resources', 'health_stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resources')
        .select('id, name, status, resource_type, last_checked_at');
      
      if (error) throw error;
      
      const stats = {
        total: data.length,
        healthy: data.filter(r => r.status === 'up').length,
        degraded: data.filter(r => r.status === 'degraded').length,
        down: data.filter(r => r.status === 'down').length,
        unknown: data.filter(r => r.status === 'unknown').length,
        resources: data,
      };
      
      return stats;
    },
  });
}

export function useUptimeMetrics(resourceId?: string, hours = 24) {
  return useQuery({
    queryKey: ['uptime_metrics', resourceId, hours],
    queryFn: async () => {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('check_results')
        .select('status, checked_at, monitoring_checks!inner(resource_id)')
        .gte('checked_at', since);
      
      if (resourceId) {
        query = query.eq('monitoring_checks.resource_id', resourceId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const total = data.length;
      const successful = data.filter(r => r.status === 'success').length;
      const failed = data.filter(r => r.status === 'failure').length;
      const uptime = total > 0 ? (successful / total) * 100 : 100;
      
      return {
        total,
        successful,
        failed,
        uptime: Math.round(uptime * 100) / 100,
        period: `${hours}h`,
      };
    },
  });
}
