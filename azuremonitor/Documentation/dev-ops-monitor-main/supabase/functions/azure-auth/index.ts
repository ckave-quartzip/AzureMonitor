import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AzureTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AzureTenant {
  id: string;
  tenant_id: string;
  client_id: string;
  subscription_id: string;
  client_secret_id: string | null;
}

// Get Azure access token using client credentials flow
export async function getAzureToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  scope: string = "https://management.azure.com/.default"
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope,
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Azure token error:", errorText);
    throw new Error(`Failed to acquire Azure token: ${response.status} - ${errorText}`);
  }

  const data: AzureTokenResponse = await response.json();
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

  if (error) {
    console.error("Error getting secret from vault:", error);
    throw new Error(`Failed to retrieve client secret: ${error.message}`);
  }

  if (!data) {
    throw new Error("Client secret not found in vault");
  }

  return data;
}

// Get tenant credentials and acquire token
export async function getTokenForTenant(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  tenantId: string
): Promise<{ token: string; tenant: AzureTenant }> {
  // Fetch tenant details
  const { data: tenant, error: tenantError } = await supabaseClient
    .from("azure_tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) {
    throw new Error(`Azure tenant not found: ${tenantError?.message || "Unknown error"}`);
  }

  if (!tenant.client_secret_id) {
    throw new Error("Azure tenant has no client secret configured");
  }

  // Get the client secret from vault
  const clientSecret = await getClientSecretFromVault(supabaseClient, tenant.client_secret_id);

  // Acquire token
  const token = await getAzureToken(tenant.tenant_id, tenant.client_id, clientSecret);

  return { token, tenant };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { action, tenantId, credentials } = await req.json();

    switch (action) {
      case "test": {
        // Test authentication with provided credentials (for validation before saving)
        if (!credentials) {
          throw new Error("Credentials required for test action");
        }
        
        const { tenant_id, client_id, client_secret } = credentials;
        
        if (!tenant_id || !client_id || !client_secret) {
          throw new Error("tenant_id, client_id, and client_secret are required");
        }

        const token = await getAzureToken(tenant_id, client_id, client_secret);
        
        // Verify token by making a simple API call
        const verifyResponse = await fetch(
          `https://management.azure.com/subscriptions?api-version=2022-12-01`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!verifyResponse.ok) {
          throw new Error("Token acquired but failed to verify access to Azure Management API");
        }

        const subscriptions = await verifyResponse.json();

        return new Response(
          JSON.stringify({
            success: true,
            message: "Authentication successful",
            subscriptions: subscriptions.value?.map((s: { subscriptionId: string; displayName: string }) => ({
              id: s.subscriptionId,
              name: s.displayName,
            })) || [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-token": {
        // Get token for a stored tenant
        if (!tenantId) {
          throw new Error("tenantId required for get-token action");
        }

        const { token, tenant } = await getTokenForTenant(supabaseClient, tenantId);

        return new Response(
          JSON.stringify({
            success: true,
            token,
            subscription_id: tenant.subscription_id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Azure auth error:", error);
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
