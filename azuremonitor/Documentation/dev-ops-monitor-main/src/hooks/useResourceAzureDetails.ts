import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, format, subDays } from 'date-fns';

export interface AzureResourceDetails {
  id: string;
  name: string;
  resource_type: string;
  location: string;
  resource_group: string;
  azure_resource_id: string;
  azure_tenant_id: string;
  tags: Record<string, string> | null;
  sku: { name?: string; tier?: string } | null;
  kind: string | null;
  properties: Record<string, any> | null;
  synced_at: string;
}

export interface AzureResourceCost {
  totalCost: number;
  currency: string;
  costTrend: { date: string; cost: number }[];
}

export function useResourceAzureDetails(azureResourceId: string | undefined) {
  return useQuery({
    queryKey: ['resource-azure-details', azureResourceId],
    queryFn: async () => {
      if (!azureResourceId) return null;

      const { data, error } = await supabase
        .from('azure_resources')
        .select('*')
        .eq('id', azureResourceId)
        .single();

      if (error) throw error;
      return data as AzureResourceDetails;
    },
    enabled: !!azureResourceId,
  });
}

export function useResourceAzureCost(azureResourceId: string | undefined) {
  return useQuery({
    queryKey: ['resource-azure-cost', azureResourceId],
    queryFn: async (): Promise<AzureResourceCost | null> => {
      if (!azureResourceId) return null;

      // Get current month start for cost calculation
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      // Get last 30 days for trend
      const trendStart = format(subDays(new Date(), 30), 'yyyy-MM-dd');

      // First get the azure_resource's azure_resource_id (the actual Azure resource ID string)
      const { data: azureResource, error: resourceError } = await supabase
        .from('azure_resources')
        .select('azure_resource_id')
        .eq('id', azureResourceId)
        .single();

      if (resourceError || !azureResource) return null;

      // Get cost data for this resource
      const { data: costData, error: costError } = await supabase
        .from('azure_cost_data')
        .select('cost_amount, currency, usage_date')
        .eq('azure_resource_id', azureResource.azure_resource_id)
        .gte('usage_date', trendStart)
        .order('usage_date', { ascending: true });

      if (costError) throw costError;

      // Calculate total cost for current month
      const monthCosts = costData?.filter(d => d.usage_date >= monthStart) || [];
      const totalCost = monthCosts.reduce((sum, d) => sum + (d.cost_amount || 0), 0);
      const currency = costData?.[0]?.currency || 'USD';

      // Build trend data
      const costTrend = costData?.map(d => ({
        date: d.usage_date,
        cost: d.cost_amount || 0,
      })) || [];

      return {
        totalCost,
        currency,
        costTrend,
      };
    },
    enabled: !!azureResourceId,
  });
}

export function useResourceAzureMetrics(azureResourceId: string | undefined) {
  return useQuery({
    queryKey: ['resource-azure-metrics', azureResourceId],
    queryFn: async () => {
      if (!azureResourceId) return {};

      const { data, error } = await supabase
        .from('azure_metrics')
        .select('*')
        .eq('azure_resource_id', azureResourceId)
        .order('timestamp_utc', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Group by metric name
      const grouped: Record<string, typeof data> = {};
      data?.forEach(metric => {
        if (!grouped[metric.metric_name]) {
          grouped[metric.metric_name] = [];
        }
        grouped[metric.metric_name].push(metric);
      });

      return grouped;
    },
    enabled: !!azureResourceId,
  });
}
