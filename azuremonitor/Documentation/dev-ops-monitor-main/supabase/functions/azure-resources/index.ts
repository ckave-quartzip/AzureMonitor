import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AzureResource {
  id: string;
  name: string;
  type: string;
  location: string;
  tags?: Record<string, string>;
  properties?: Record<string, unknown>;
  sku?: Record<string, unknown>;
  kind?: string;
}

interface AzureResourceListResponse {
  value: AzureResource[];
  nextLink?: string;
}

// Get Azure access token
async function getAzureToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://management.azure.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to acquire Azure token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get client secret from Supabase Vault
async function getClientSecretFromVault(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  secretId: string
): Promise<string> {
  const { data, error } = await supabaseClient
    .rpc('get_decrypted_setting', { p_setting_key: `azure_client_secret_${secretId}` });

  if (error || !data) {
    throw new Error(`Failed to retrieve client secret: ${error?.message || "Not found"}`);
  }

  return data;
}

// Extract resource group from Azure resource ID
function extractResourceGroup(resourceId: string): string {
  const match = resourceId.match(/\/resourceGroups\/([^\/]+)/i);
  return match ? match[1] : "unknown";
}

// Fetch all resources from Azure (with pagination)
async function fetchAllResources(
  token: string,
  subscriptionId: string
): Promise<AzureResource[]> {
  const allResources: AzureResource[] = [];
  let url: string | null = `https://management.azure.com/subscriptions/${subscriptionId}/resources?api-version=2021-04-01`;

  while (url) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch resources: ${response.status} - ${errorText}`);
    }

    const data: AzureResourceListResponse = await response.json();
    allResources.push(...data.value);
    url = data.nextLink || null;
  }

  return allResources;
}

// Fetch resource groups from Azure
async function fetchResourceGroups(
  token: string,
  subscriptionId: string
): Promise<Array<{ name: string; location: string }>> {
  const response = await fetch(
    `https://management.azure.com/subscriptions/${subscriptionId}/resourcegroups?api-version=2021-04-01`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch resource groups: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.value.map((rg: { name: string; location: string }) => ({
    name: rg.name,
    location: rg.location,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { action, tenantId, credentials, resourceGroup, filters } = body;

    switch (action) {
      case "test": {
        // Test fetch resources with provided credentials (before saving tenant)
        if (!credentials) {
          throw new Error("Credentials required for test action");
        }

        const { tenant_id, client_id, client_secret, subscription_id } = credentials;

        if (!tenant_id || !client_id || !client_secret || !subscription_id) {
          throw new Error("tenant_id, client_id, client_secret, and subscription_id are required");
        }

        const token = await getAzureToken(tenant_id, client_id, client_secret);
        const resources = await fetchAllResources(token, subscription_id);
        const resourceGroups = await fetchResourceGroups(token, subscription_id);

        // Group resources by type
        const byType: Record<string, number> = {};
        const byResourceGroup: Record<string, number> = {};

        for (const resource of resources) {
          byType[resource.type] = (byType[resource.type] || 0) + 1;
          const rg = extractResourceGroup(resource.id);
          byResourceGroup[rg] = (byResourceGroup[rg] || 0) + 1;
        }

        return new Response(
          JSON.stringify({
            success: true,
            total_resources: resources.length,
            resource_groups: resourceGroups,
            by_type: byType,
            by_resource_group: byResourceGroup,
            sample_resources: resources.slice(0, 20).map((r) => ({
              name: r.name,
              type: r.type,
              location: r.location,
              resource_group: extractResourceGroup(r.id),
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "sync": {
        // Sync resources from Azure to database
        if (!tenantId) {
          throw new Error("tenantId required for sync action");
        }

        // Get tenant details
        const { data: tenant, error: tenantError } = await supabaseClient
          .from("azure_tenants")
          .select("*")
          .eq("id", tenantId)
          .single();

        if (tenantError || !tenant) {
          throw new Error(`Tenant not found: ${tenantError?.message}`);
        }

        // Create sync log entry
        const { data: syncLog, error: syncLogError } = await supabaseClient
          .from("azure_sync_logs")
          .insert({
            azure_tenant_id: tenantId,
            sync_type: "resources",
            status: "running",
          })
          .select()
          .single();

        if (syncLogError) {
          console.error("Failed to create sync log:", syncLogError);
        }

        try {
          // Get token
          const clientSecret = await getClientSecretFromVault(supabaseClient, tenant.client_secret_id);
          const token = await getAzureToken(tenant.tenant_id, tenant.client_id, clientSecret);

          // Fetch resources
          const resources = await fetchAllResources(token, tenant.subscription_id);

          // Upsert resources to database
          const upsertData = resources.map((r) => ({
            azure_tenant_id: tenantId,
            azure_resource_id: r.id,
            resource_group: extractResourceGroup(r.id),
            name: r.name,
            resource_type: r.type,
            location: r.location,
            tags: r.tags || {},
            properties: r.properties || {},
            sku: r.sku || null,
            kind: r.kind || null,
            synced_at: new Date().toISOString(),
          }));

          // Batch upsert (Supabase handles conflicts via ON CONFLICT)
          const { error: upsertError } = await supabaseClient
            .from("azure_resources")
            .upsert(upsertData, { onConflict: "azure_tenant_id,azure_resource_id" });

          if (upsertError) {
            throw new Error(`Failed to upsert resources: ${upsertError.message}`);
          }

          // Update tenant last_sync_at
          await supabaseClient
            .from("azure_tenants")
            .update({ last_sync_at: new Date().toISOString() })
            .eq("id", tenantId);

          // Update sync log
          if (syncLog) {
            await supabaseClient
              .from("azure_sync_logs")
              .update({
                status: "success",
                completed_at: new Date().toISOString(),
                records_processed: resources.length,
              })
              .eq("id", syncLog.id);
          }

          return new Response(
            JSON.stringify({
              success: true,
              message: `Synced ${resources.length} resources`,
              count: resources.length,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (error) {
          // Update sync log with error
          if (syncLog) {
            await supabaseClient
              .from("azure_sync_logs")
              .update({
                status: "failed",
                completed_at: new Date().toISOString(),
                error_message: error instanceof Error ? error.message : "Unknown error",
              })
              .eq("id", syncLog.id);
          }
          throw error;
        }
      }

      case "list": {
        // List resources from database
        if (!tenantId) {
          throw new Error("tenantId required for list action");
        }

        let query = supabaseClient
          .from("azure_resources")
          .select("*")
          .eq("azure_tenant_id", tenantId);

        if (resourceGroup) {
          query = query.eq("resource_group", resourceGroup);
        }

        if (filters?.resourceType) {
          query = query.eq("resource_type", filters.resourceType);
        }

        const { data, error } = await query.order("name");

        if (error) {
          throw new Error(`Failed to list resources: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, resources: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "resource-groups": {
        // Get resource groups for a tenant
        if (!tenantId) {
          throw new Error("tenantId required for resource-groups action");
        }

        // Get tenant details
        const { data: tenant, error: tenantError } = await supabaseClient
          .from("azure_tenants")
          .select("*")
          .eq("id", tenantId)
          .single();

        if (tenantError || !tenant) {
          throw new Error(`Tenant not found: ${tenantError?.message}`);
        }

        const clientSecret = await getClientSecretFromVault(supabaseClient, tenant.client_secret_id);
        const token = await getAzureToken(tenant.tenant_id, tenant.client_id, clientSecret);
        const resourceGroups = await fetchResourceGroups(token, tenant.subscription_id);

        return new Response(
          JSON.stringify({ success: true, resource_groups: resourceGroups }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "details": {
        // Get details for a specific resource
        const { resourceId } = body;
        
        if (!resourceId) {
          throw new Error("resourceId required for details action");
        }

        const { data, error } = await supabaseClient
          .from("azure_resources")
          .select("*")
          .eq("id", resourceId)
          .single();

        if (error) {
          throw new Error(`Resource not found: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, resource: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Azure resources error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
