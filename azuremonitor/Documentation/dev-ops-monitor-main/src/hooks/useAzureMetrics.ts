import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AzureMetric {
  id: string;
  azure_resource_id: string;
  metric_name: string;
  metric_namespace: string;
  timestamp_utc: string;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  total: number | null;
  count: number | null;
  unit: string | null;
  created_at: string;
}

export interface ResourceWithMetrics {
  id: string;
  name: string;
  resource_type: string;
  metrics: Record<string, AzureMetric>;
}

export function useAzureResourceMetrics(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['azure-resource-metrics', resourceId],
    queryFn: async () => {
      if (!resourceId) return {};

      const { data, error } = await supabase.functions.invoke('azure-metrics', {
        body: {
          action: 'resource',
          resourceId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.metrics as Record<string, AzureMetric[]>;
    },
    enabled: !!resourceId,
  });
}

export function useAzureLatestMetrics(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['azure-latest-metrics', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase.functions.invoke('azure-metrics', {
        body: {
          action: 'latest',
          tenantId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data.resources as ResourceWithMetrics[];
    },
    enabled: !!tenantId,
  });
}
