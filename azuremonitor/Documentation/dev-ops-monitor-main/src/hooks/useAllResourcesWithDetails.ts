import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResourceWithDetails {
  id: string;
  name: string;
  description: string | null;
  resource_type: string;
  status: 'up' | 'down' | 'degraded' | 'unknown';
  last_checked_at: string | null;
  client_id: string | null;
  client_name: string | null;
  environment_id: string | null;
  environment_name: string | null;
  is_standalone: boolean;
  monitoring_check_count: number;
  active_alert_count: number;
}

interface UseAllResourcesWithDetailsOptions {
  clientId?: string;
  environmentId?: string;
}

const STATUS_PRIORITY: Record<string, number> = {
  down: 0,
  degraded: 1,
  unknown: 2,
  up: 3,
};

export function useAllResourcesWithDetails(options: UseAllResourcesWithDetailsOptions = {}) {
  const { clientId, environmentId } = options;

  return useQuery({
    queryKey: ['all-resources-with-details', clientId, environmentId],
    queryFn: async (): Promise<ResourceWithDetails[]> => {
      // Fetch resources with client and environment names
      let query = supabase
        .from('resources')
        .select(`
          id,
          name,
          description,
          resource_type,
          status,
          last_checked_at,
          client_id,
          environment_id,
          is_standalone,
          clients(name),
          environments(name, client_id, clients(name))
        `);

      if (environmentId) {
        query = query.eq('environment_id', environmentId);
      }

      const { data: resources, error: resourcesError } = await query;

      if (resourcesError) throw resourcesError;

      if (!resources || resources.length === 0) {
        return [];
      }

      // Filter by client (either direct or through environment)
      let filteredResources = resources;
      if (clientId) {
        filteredResources = resources.filter((r) => {
          const directClientId = r.client_id;
          const envClientId = (r.environments as any)?.client_id;
          return directClientId === clientId || envClientId === clientId;
        });
      }

      if (filteredResources.length === 0) {
        return [];
      }

      // Fetch monitoring check counts for all resources
      const resourceIds = filteredResources.map((r) => r.id);
      
      const { data: monitoringCounts, error: monitoringError } = await supabase
        .from('monitoring_checks')
        .select('resource_id')
        .in('resource_id', resourceIds)
        .eq('is_enabled', true);

      if (monitoringError) throw monitoringError;

      // Fetch active alert counts (unresolved alerts)
      const { data: alertCounts, error: alertsError } = await supabase
        .from('alerts')
        .select('resource_id')
        .in('resource_id', resourceIds)
        .is('resolved_at', null);

      if (alertsError) throw alertsError;

      // Count monitoring checks per resource
      const monitoringCountMap = new Map<string, number>();
      monitoringCounts?.forEach((mc) => {
        const count = monitoringCountMap.get(mc.resource_id) || 0;
        monitoringCountMap.set(mc.resource_id, count + 1);
      });

      // Count active alerts per resource
      const alertCountMap = new Map<string, number>();
      alertCounts?.forEach((a) => {
        const count = alertCountMap.get(a.resource_id) || 0;
        alertCountMap.set(a.resource_id, count + 1);
      });

      // Map resources with additional details
      const resourcesWithDetails: ResourceWithDetails[] = filteredResources.map((r) => {
        // Get client info - first try direct client, then fall back to environment's client
        const directClientName = (r.clients as any)?.name || null;
        const envClientName = (r.environments as any)?.clients?.name || null;
        const clientName = directClientName || envClientName;
        
        const directClientId = r.client_id;
        const envClientId = (r.environments as any)?.client_id || null;
        const resolvedClientId = directClientId || envClientId;

        return {
          id: r.id,
          name: r.name,
          description: r.description,
          resource_type: r.resource_type,
          status: r.status as ResourceWithDetails['status'],
          last_checked_at: r.last_checked_at,
          client_id: resolvedClientId,
          client_name: clientName,
          environment_id: r.environment_id,
          environment_name: (r.environments as any)?.name || null,
          is_standalone: r.is_standalone,
          monitoring_check_count: monitoringCountMap.get(r.id) || 0,
          active_alert_count: alertCountMap.get(r.id) || 0,
        };
      });

      // Sort: problems first, then alphabetically
      resourcesWithDetails.sort((a, b) => {
        const priorityA = STATUS_PRIORITY[a.status] ?? 99;
        const priorityB = STATUS_PRIORITY[b.status] ?? 99;
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return a.name.localeCompare(b.name);
      });

      return resourcesWithDetails;
    },
  });
}

export function useClients() {
  return useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

export function useEnvironmentsList(clientId?: string) {
  return useQuery({
    queryKey: ['environments-list', clientId],
    queryFn: async () => {
      let query = supabase
        .from('environments')
        .select('id, name, client_id')
        .order('name');
      
      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
