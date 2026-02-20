import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResourceWithScore {
  id: string;
  name: string;
  resource_type: string;
  resource_group: string;
  location: string;
  azure_tenant_id: string;
  optimization_score: number | null;
  score_breakdown: {
    utilization?: number;
    costEfficiency?: number;
    bestPractices?: number;
  } | null;
  score_updated_at: string | null;
}

export function useOptimizationScores(tenantId?: string) {
  return useQuery({
    queryKey: ['optimization-scores', tenantId],
    queryFn: async (): Promise<ResourceWithScore[]> => {
      const RESOURCE_LIMIT = 2000;
      let query = supabase
        .from('azure_resources')
        .select('id, name, resource_type, resource_group, location, azure_tenant_id, optimization_score, score_breakdown, score_updated_at')
        .not('optimization_score', 'is', null)
        .order('optimization_score', { ascending: true })
        .limit(RESOURCE_LIMIT);

      if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as ResourceWithScore[];
    },
  });
}

export function useLowScoreResources(threshold: number = 70, tenantIds?: string[]) {
  return useQuery({
    queryKey: ['low-score-resources', threshold, tenantIds],
    queryFn: async (): Promise<ResourceWithScore[]> => {
      let query = supabase
        .from('azure_resources')
        .select('id, name, resource_type, resource_group, location, azure_tenant_id, optimization_score, score_breakdown, score_updated_at')
        .not('optimization_score', 'is', null)
        .lt('optimization_score', threshold)
        .order('optimization_score', { ascending: true })
        .limit(20);

      if (tenantIds && tenantIds.length > 0) {
        query = query.in('azure_tenant_id', tenantIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ResourceWithScore[];
    },
  });
}

export function useOptimizationSummary(tenantIds?: string[]) {
  return useQuery({
    queryKey: ['optimization-summary', tenantIds],
    queryFn: async () => {
      let query = supabase
        .from('azure_resources')
        .select('optimization_score')
        .not('optimization_score', 'is', null);

      if (tenantIds && tenantIds.length > 0) {
        query = query.in('azure_tenant_id', tenantIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      const scores = (data || []).map(d => d.optimization_score as number);
      
      if (scores.length === 0) {
        return {
          totalResources: 0,
          avgScore: 0,
          gradeA: 0,
          gradeB: 0,
          gradeC: 0,
          gradeD: 0,
          gradeF: 0,
          needsAttention: 0,
        };
      }

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      return {
        totalResources: scores.length,
        avgScore: Math.round(avgScore),
        gradeA: scores.filter(s => s >= 90).length,
        gradeB: scores.filter(s => s >= 80 && s < 90).length,
        gradeC: scores.filter(s => s >= 70 && s < 80).length,
        gradeD: scores.filter(s => s >= 60 && s < 70).length,
        gradeF: scores.filter(s => s < 60).length,
        needsAttention: scores.filter(s => s < 70).length,
      };
    },
  });
}

export function useResourceScore(resourceId: string) {
  return useQuery({
    queryKey: ['resource-score', resourceId],
    queryFn: async (): Promise<ResourceWithScore | null> => {
      const { data, error } = await supabase
        .from('azure_resources')
        .select('id, name, resource_type, resource_group, location, azure_tenant_id, optimization_score, score_breakdown, score_updated_at')
        .eq('id', resourceId)
        .single();

      if (error) throw error;
      return data as ResourceWithScore | null;
    },
    enabled: !!resourceId,
  });
}

export function useRunScoreCalculation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tenantId?: string | undefined) => {
      const { data, error } = await supabase.functions.invoke('azure-resource-analysis', {
        body: { action: 'calculate-scores', tenantId: tenantId || null },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-scores'] });
      queryClient.invalidateQueries({ queryKey: ['optimization-summary'] });
      queryClient.invalidateQueries({ queryKey: ['low-score-resources'] });
    },
  });
}

// Helper to get grade letter from score
export function getGradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// Helper to get grade color
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-green-500';
    case 'B': return 'text-blue-500';
    case 'C': return 'text-yellow-500';
    case 'D': return 'text-orange-500';
    case 'F': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
}

export function getGradeBg(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-green-500/10 border-green-500/20';
    case 'B': return 'bg-blue-500/10 border-blue-500/20';
    case 'C': return 'bg-yellow-500/10 border-yellow-500/20';
    case 'D': return 'bg-orange-500/10 border-orange-500/20';
    case 'F': return 'bg-red-500/10 border-red-500/20';
    default: return 'bg-muted';
  }
}
