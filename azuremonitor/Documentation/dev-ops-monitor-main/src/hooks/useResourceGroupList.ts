import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useResourceGroupList(tenantId?: string) {
  return useQuery({
    queryKey: ['resource-groups', tenantId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('azure_cost_data')
        .select('resource_group')
        .not('resource_group', 'is', null);

      if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unique resource groups
      const uniqueGroups = [...new Set(
        (data || [])
          .map(d => d.resource_group)
          .filter((g): g is string => g !== null && g !== '')
      )].sort();

      return uniqueGroups;
    },
  });
}

export function useMeterCategoryList(tenantId?: string) {
  return useQuery({
    queryKey: ['meter-categories', tenantId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('azure_cost_data')
        .select('meter_category')
        .not('meter_category', 'is', null);

      if (tenantId) {
        query = query.eq('azure_tenant_id', tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unique categories
      const uniqueCategories = [...new Set(
        (data || [])
          .map(d => d.meter_category)
          .filter((c): c is string => c !== null && c !== '')
      )].sort();

      return uniqueCategories;
    },
  });
}
