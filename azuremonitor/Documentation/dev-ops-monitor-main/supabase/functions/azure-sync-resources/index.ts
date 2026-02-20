import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This is a cron job handler that syncs resources for all enabled Azure tenants

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting Azure resource sync cron job...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get all enabled tenants
    const { data: tenants, error: tenantsError } = await supabaseClient
      .from("azure_tenants")
      .select("id, name")
      .eq("is_enabled", true);

    if (tenantsError) {
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    console.log(`Found ${tenants?.length || 0} enabled Azure tenants`);

    const results = [];

    for (const tenant of tenants || []) {
      console.log(`Syncing resources for tenant: ${tenant.name} (${tenant.id})`);
      
      try {
        // Call the azure-resources function with sync action
        const { data, error } = await supabaseClient.functions.invoke('azure-resources', {
          body: {
            action: 'sync',
            tenantId: tenant.id,
          },
        });

        if (error) {
          console.error(`Error syncing tenant ${tenant.id}:`, error);
          results.push({ tenant: tenant.name, success: false, error: error.message });
        } else {
          console.log(`Synced ${data?.count || 0} resources for tenant ${tenant.name}`);
          results.push({ tenant: tenant.name, success: true, count: data?.count || 0 });
        }
      } catch (err) {
        console.error(`Exception syncing tenant ${tenant.id}:`, err);
        results.push({ 
          tenant: tenant.name, 
          success: false, 
          error: err instanceof Error ? err.message : "Unknown error" 
        });
      }
    }

    console.log("Azure resource sync cron job completed");

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${tenants?.length || 0} tenants`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Azure sync resources cron error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
