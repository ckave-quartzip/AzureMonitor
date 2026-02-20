import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StorageTrendPoint {
  timestamp_utc: string;
  data_space_used_bytes: number | null;
  data_space_allocated_bytes: number | null;
  storage_percent: number | null;
  max_size_bytes: number | null;
}

export interface StorageProjection {
  dailyGrowthBytes: number;
  daysUntilFull: number | null;
  projectedFullDate: Date | null;
  monthlyGrowthBytes: number;
  growthTrend: 'stable' | 'increasing' | 'decreasing';
}

// Format bytes to human readable
export function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  const size = sizes[Math.min(i, sizes.length - 1)];
  const value = bytes / Math.pow(k, Math.min(i, sizes.length - 1));
  
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${size}`;
}

export function useSqlStorageTrends(resourceId: string, days: number = 30) {
  return useQuery({
    queryKey: ['sql-storage-trends', resourceId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('azure_sql_performance_stats')
        .select('timestamp_utc, data_space_used_bytes, data_space_allocated_bytes, storage_percent, max_size_bytes')
        .eq('azure_resource_id', resourceId)
        .gte('timestamp_utc', startDate.toISOString())
        .order('timestamp_utc', { ascending: true });

      if (error) throw error;
      return data as StorageTrendPoint[];
    },
    enabled: !!resourceId,
  });
}

export function useSqlStorageLatest(resourceId: string) {
  return useQuery({
    queryKey: ['sql-storage-latest', resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('azure_sql_performance_stats')
        .select('timestamp_utc, data_space_used_bytes, data_space_allocated_bytes, storage_percent, max_size_bytes, log_space_used_bytes, log_space_used_percent')
        .eq('azure_resource_id', resourceId)
        .order('timestamp_utc', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!resourceId,
  });
}

export function useStorageProjection(resourceId: string): { data: StorageProjection | null, isLoading: boolean } {
  const { data: trends, isLoading } = useSqlStorageTrends(resourceId, 30);

  if (isLoading || !trends || trends.length < 2) {
    return { data: null, isLoading };
  }

  // Filter data points that have storage data
  const validPoints = trends.filter(p => p.data_space_used_bytes !== null);
  
  if (validPoints.length < 2) {
    return { data: null, isLoading: false };
  }

  // Calculate growth rate using linear regression
  const firstPoint = validPoints[0];
  const lastPoint = validPoints[validPoints.length - 1];
  
  const timeDiffMs = new Date(lastPoint.timestamp_utc).getTime() - new Date(firstPoint.timestamp_utc).getTime();
  const timeDiffDays = timeDiffMs / (1000 * 60 * 60 * 24);
  
  if (timeDiffDays <= 0) {
    return { data: null, isLoading: false };
  }

  const bytesGrown = (lastPoint.data_space_used_bytes || 0) - (firstPoint.data_space_used_bytes || 0);
  const dailyGrowthBytes = bytesGrown / timeDiffDays;
  const monthlyGrowthBytes = dailyGrowthBytes * 30;

  // Calculate days until full
  let daysUntilFull: number | null = null;
  let projectedFullDate: Date | null = null;

  if (lastPoint.max_size_bytes && lastPoint.data_space_used_bytes && dailyGrowthBytes > 0) {
    const remainingBytes = lastPoint.max_size_bytes - lastPoint.data_space_used_bytes;
    daysUntilFull = Math.floor(remainingBytes / dailyGrowthBytes);
    
    if (daysUntilFull > 0 && daysUntilFull < 3650) { // Cap at 10 years
      projectedFullDate = new Date();
      projectedFullDate.setDate(projectedFullDate.getDate() + daysUntilFull);
    }
  }

  // Determine growth trend
  let growthTrend: 'stable' | 'increasing' | 'decreasing' = 'stable';
  if (validPoints.length >= 7) {
    const midIndex = Math.floor(validPoints.length / 2);
    const firstHalf = validPoints.slice(0, midIndex);
    const secondHalf = validPoints.slice(midIndex);
    
    const firstHalfGrowth = firstHalf.length >= 2 
      ? ((firstHalf[firstHalf.length - 1].data_space_used_bytes || 0) - (firstHalf[0].data_space_used_bytes || 0)) / firstHalf.length
      : 0;
    const secondHalfGrowth = secondHalf.length >= 2
      ? ((secondHalf[secondHalf.length - 1].data_space_used_bytes || 0) - (secondHalf[0].data_space_used_bytes || 0)) / secondHalf.length
      : 0;

    if (secondHalfGrowth > firstHalfGrowth * 1.2) {
      growthTrend = 'increasing';
    } else if (secondHalfGrowth < firstHalfGrowth * 0.8) {
      growthTrend = 'decreasing';
    }
  }

  return {
    data: {
      dailyGrowthBytes,
      daysUntilFull,
      projectedFullDate,
      monthlyGrowthBytes,
      growthTrend,
    },
    isLoading: false,
  };
}

// Hook for aggregate storage across all databases
export function useAllDatabasesStorage() {
  return useQuery({
    queryKey: ['all-databases-storage'],
    queryFn: async () => {
      // Get latest stats for all SQL databases
      const { data: resources, error: resourcesError } = await supabase
        .from('azure_resources')
        .select('id, name, resource_group')
        .or('resource_type.ilike.%sql%,resource_type.ilike.%database%');

      if (resourcesError) throw resourcesError;
      if (!resources || resources.length === 0) return [];

      // Get latest storage stats for each
      const storagePromises = resources.map(async (resource) => {
        const { data } = await supabase
          .from('azure_sql_performance_stats')
          .select('data_space_used_bytes, data_space_allocated_bytes, storage_percent, max_size_bytes')
          .eq('azure_resource_id', resource.id)
          .order('timestamp_utc', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...resource,
          storage: data,
        };
      });

      return Promise.all(storagePromises);
    },
  });
}
