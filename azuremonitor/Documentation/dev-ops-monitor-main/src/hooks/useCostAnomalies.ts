import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CostAnomaly {
  id: string;
  azure_tenant_id: string;
  azure_resource_id: string | null;
  resource_group: string | null;
  anomaly_date: string;
  expected_cost: number;
  actual_cost: number;
  deviation_percent: number;
  anomaly_type: 'spike' | 'drop';
  severity: 'info' | 'warning' | 'critical';
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
}

export function useCostAnomalies(tenantId?: string, limit: number = 20) {
  return useQuery({
    queryKey: ['cost-anomalies', tenantId, limit],
    queryFn: async (): Promise<CostAnomaly[]> => {
      let query = supabase
        .from('azure_cost_anomalies')
        .select('*')
        .order('anomaly_date', { ascending: false })
        .limit(limit);

      if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []) as CostAnomaly[];
    },
  });
}

export function useUnacknowledgedAnomalies(includeHistorical: boolean = false, tenantIds?: string[]) {
  return useQuery({
    queryKey: ['cost-anomalies-unacknowledged', includeHistorical, tenantIds],
    queryFn: async (): Promise<CostAnomaly[]> => {
      // Default: only show anomalies from the last 7 days
      // This prevents historical imports from flooding the anomaly list
      const cutoffDays = includeHistorical ? 365 : 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);

      let query = supabase
        .from('azure_cost_anomalies')
        .select('*')
        .eq('is_acknowledged', false)
        .gte('anomaly_date', cutoffDate.toISOString().split('T')[0])
        .order('severity', { ascending: false })
        .order('anomaly_date', { ascending: false })
        .limit(50);

      if (tenantIds && tenantIds.length > 0) {
        query = query.in('azure_tenant_id', tenantIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as CostAnomaly[];
    },
  });
}

export function useAcknowledgeAnomaly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      anomalyId, 
      notes 
    }: { 
      anomalyId: string; 
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('azure_cost_anomalies')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
          notes,
        })
        .eq('id', anomalyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['cost-anomalies-unacknowledged'] });
    },
  });
}

export function useAnomalySummary(tenantIds?: string[]) {
  return useQuery({
    queryKey: ['cost-anomaly-summary', tenantIds],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let query = supabase
        .from('azure_cost_anomalies')
        .select('severity, anomaly_type, is_acknowledged, deviation_percent')
        .gte('anomaly_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (tenantIds && tenantIds.length > 0) {
        query = query.in('azure_tenant_id', tenantIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      const anomalies = (data || []) as Pick<CostAnomaly, 'severity' | 'anomaly_type' | 'is_acknowledged' | 'deviation_percent'>[];
      
      return {
        total: anomalies.length,
        unacknowledged: anomalies.filter(a => !a.is_acknowledged).length,
        critical: anomalies.filter(a => a.severity === 'critical').length,
        warning: anomalies.filter(a => a.severity === 'warning').length,
        spikes: anomalies.filter(a => a.anomaly_type === 'spike').length,
        drops: anomalies.filter(a => a.anomaly_type === 'drop').length,
        avgDeviation: anomalies.length > 0
          ? anomalies.reduce((sum, a) => sum + Math.abs(a.deviation_percent), 0) / anomalies.length
          : 0,
      };
    },
  });
}

export function useRunAnomalyDetection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: { tenantId?: string; skipHistorical?: boolean; historicalCutoffDays?: number }) => {
      const { data, error } = await supabase.functions.invoke('azure-resource-analysis', {
        body: { 
          action: 'detect-anomalies', 
          tenantId: options?.tenantId || null,
          // Default to skipping historical data - only detect anomalies from last 3 days
          skipHistorical: options?.skipHistorical ?? true,
          historicalCutoffDays: options?.historicalCutoffDays ?? 3,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['cost-anomaly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['cost-anomalies-unacknowledged'] });
    },
  });
}
