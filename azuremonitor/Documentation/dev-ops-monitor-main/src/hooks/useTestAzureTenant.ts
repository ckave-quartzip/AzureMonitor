import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestCredentials {
  tenant_id: string;
  client_id: string;
  client_secret: string;
  subscription_id: string;
}

interface Subscription {
  id: string;
  name: string;
}

interface ResourceSummary {
  name: string;
  type: string;
  location: string;
  resource_group: string;
}

interface TestConnectionResult {
  success: boolean;
  message?: string;
  subscriptions?: Subscription[];
  error?: string;
}

interface TestResourcesResult {
  success: boolean;
  total_resources?: number;
  resource_groups?: Array<{ name: string; location: string }>;
  by_type?: Record<string, number>;
  by_resource_group?: Record<string, number>;
  sample_resources?: ResourceSummary[];
  error?: string;
}

export function useTestAzureTenant() {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingResources, setIsTestingResources] = useState(false);
  const [connectionResult, setConnectionResult] = useState<TestConnectionResult | null>(null);
  const [resourcesResult, setResourcesResult] = useState<TestResourcesResult | null>(null);

  const testConnection = async (credentials: TestCredentials): Promise<TestConnectionResult> => {
    setIsTestingConnection(true);
    setConnectionResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('azure-auth', {
        body: {
          action: 'test',
          credentials: {
            tenant_id: credentials.tenant_id,
            client_id: credentials.client_id,
            client_secret: credentials.client_secret,
          },
        },
      });

      if (error) {
        const result: TestConnectionResult = {
          success: false,
          error: error.message,
        };
        setConnectionResult(result);
        toast({
          title: 'Connection test failed',
          description: error.message,
          variant: 'destructive',
        });
        return result;
      }

      if (!data.success) {
        const result: TestConnectionResult = {
          success: false,
          error: data.error || 'Unknown error',
        };
        setConnectionResult(result);
        toast({
          title: 'Connection test failed',
          description: data.error,
          variant: 'destructive',
        });
        return result;
      }

      const result: TestConnectionResult = {
        success: true,
        message: 'Authentication successful',
        subscriptions: data.subscriptions,
      };
      setConnectionResult(result);
      toast({
        title: 'Connection successful',
        description: `Found ${data.subscriptions?.length || 0} subscription(s)`,
      });
      return result;
    } catch (err) {
      const result: TestConnectionResult = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
      setConnectionResult(result);
      toast({
        title: 'Connection test failed',
        description: result.error,
        variant: 'destructive',
      });
      return result;
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testFetchResources = async (credentials: TestCredentials): Promise<TestResourcesResult> => {
    setIsTestingResources(true);
    setResourcesResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('azure-resources', {
        body: {
          action: 'test',
          credentials: {
            tenant_id: credentials.tenant_id,
            client_id: credentials.client_id,
            client_secret: credentials.client_secret,
            subscription_id: credentials.subscription_id,
          },
        },
      });

      if (error) {
        const result: TestResourcesResult = {
          success: false,
          error: error.message,
        };
        setResourcesResult(result);
        toast({
          title: 'Resource fetch failed',
          description: error.message,
          variant: 'destructive',
        });
        return result;
      }

      if (!data.success) {
        const result: TestResourcesResult = {
          success: false,
          error: data.error || 'Unknown error',
        };
        setResourcesResult(result);
        toast({
          title: 'Resource fetch failed',
          description: data.error,
          variant: 'destructive',
        });
        return result;
      }

      const result: TestResourcesResult = {
        success: true,
        total_resources: data.total_resources,
        resource_groups: data.resource_groups,
        by_type: data.by_type,
        by_resource_group: data.by_resource_group,
        sample_resources: data.sample_resources,
      };
      setResourcesResult(result);
      toast({
        title: 'Resources fetched successfully',
        description: `Found ${data.total_resources} resources in ${data.resource_groups?.length || 0} resource groups`,
      });
      return result;
    } catch (err) {
      const result: TestResourcesResult = {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
      setResourcesResult(result);
      toast({
        title: 'Resource fetch failed',
        description: result.error,
        variant: 'destructive',
      });
      return result;
    } finally {
      setIsTestingResources(false);
    }
  };

  const clearResults = () => {
    setConnectionResult(null);
    setResourcesResult(null);
  };

  return {
    testConnection,
    testFetchResources,
    isTestingConnection,
    isTestingResources,
    connectionResult,
    resourcesResult,
    clearResults,
  };
}
