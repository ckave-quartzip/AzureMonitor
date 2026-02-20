import { useMemo } from 'react';
import { CostTrendPoint } from './useCostComparison';

export interface CostSpike {
  date: string;
  cost: number;
  dailyAverage: number;
  percentAboveAverage: number;
  normalizedDay: number;
}

export function useCostSpikes(
  dailyCosts: CostTrendPoint[] | undefined,
  threshold: number = 2.0 // Cost must be 2x the average to be a spike
) {
  return useMemo(() => {
    if (!dailyCosts || dailyCosts.length === 0) {
      return [];
    }

    const totalCost = dailyCosts.reduce((sum, d) => sum + d.cost, 0);
    const dailyAverage = totalCost / dailyCosts.length;

    if (dailyAverage === 0) {
      return [];
    }

    const spikes: CostSpike[] = dailyCosts
      .filter(d => d.cost >= dailyAverage * threshold)
      .map(d => ({
        date: d.date,
        cost: d.cost,
        dailyAverage,
        percentAboveAverage: ((d.cost - dailyAverage) / dailyAverage) * 100,
        normalizedDay: d.normalizedDay,
      }))
      .sort((a, b) => b.percentAboveAverage - a.percentAboveAverage);

    return spikes;
  }, [dailyCosts, threshold]);
}
