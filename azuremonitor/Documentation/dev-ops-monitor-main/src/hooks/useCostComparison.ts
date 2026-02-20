import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CostComparisonParams {
  period1Start: string;
  period1End: string;
  period2Start: string;
  period2End: string;
  excludeResourceGroups: string[];
  tenantId?: string;
  meterCategories?: string[];
}

export interface CostTrendPoint {
  date: string;
  cost: number;
  normalizedDay: number;
}

export interface CostBreakdown {
  name: string;
  period1Cost: number;
  period2Cost: number;
  variance: number;
  percentChange: number;
  isNew: boolean;        // Exists in Period 1 but NOT in Period 2
  isRemoved: boolean;    // Exists in Period 2 but NOT in Period 1
  hasSavings: boolean;   // Cost decreased (negative variance on existing item)
  savingsAmount: number; // The amount saved (positive number)
  deletedFromAzure?: boolean; // Resource no longer exists in Azure (only for byResource)
}

export interface PeriodCosts {
  totalCost: number;
  dailyCosts: CostTrendPoint[];
  byResourceGroup: CostBreakdown[];
  byCategory: CostBreakdown[];
  byResource: CostBreakdown[];
  dailyAverage: number;
  daysInPeriod: number;
}

export interface CostComparisonResult {
  period1: PeriodCosts;
  period2: PeriodCosts;
  variance: {
    absoluteDiff: number;
    percentChange: number;
  };
  excludedCost: {
    period1: number;
    period2: number;
  };
}

export function useCostComparison(params: CostComparisonParams | null) {
  return useQuery({
    queryKey: ['cost-comparison', params],
    queryFn: async (): Promise<CostComparisonResult> => {
      if (!params) throw new Error('No parameters provided');

      // Use edge function for server-side aggregation to bypass 1000 row limit
      const { data, error } = await supabase.functions.invoke('azure-costs', {
        body: {
          action: 'cost-comparison',
          tenantId: params.tenantId,
          period1Start: params.period1Start,
          period1End: params.period1End,
          period2Start: params.period2Start,
          period2End: params.period2End,
          excludeResourceGroups: params.excludeResourceGroups,
          meterCategories: params.meterCategories,
        },
      });

      if (error) {
        console.error('Cost comparison error:', error);
        throw new Error(`Failed to fetch cost comparison: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error fetching cost comparison');
      }

      return data.data as CostComparisonResult;
    },
    enabled: !!params,
  });
}
