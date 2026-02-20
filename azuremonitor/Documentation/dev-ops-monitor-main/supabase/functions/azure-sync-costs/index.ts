import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Background sync function
async function performCostSync() {
  console.log("Starting Azure cost sync background task...");
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Get all enabled tenants
    const { data: tenants, error: tenantsError } = await supabaseClient
      .from("azure_tenants")
      .select("id, name")
      .eq("is_enabled", true);

    if (tenantsError) {
      console.error(`Failed to fetch tenants: ${tenantsError.message}`);
      return;
    }

    console.log(`Found ${tenants?.length || 0} enabled Azure tenants`);

    // Calculate date range (last 7 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const tenant of tenants || []) {
      console.log(`Syncing costs for tenant: ${tenant.name} (${tenant.id})`);
      
      // Create sync log entry
      const { data: syncLog, error: logError } = await supabaseClient
        .from('azure_sync_logs')
        .insert({
          azure_tenant_id: tenant.id,
          sync_type: 'costs',
          status: 'running',
        })
        .select()
        .single();

      if (logError) {
        console.error(`Failed to create sync log for tenant ${tenant.id}:`, logError);
      }
      
      try {
        // Call the azure-costs function with sync action
        const { data, error } = await supabaseClient.functions.invoke('azure-costs', {
          body: {
            action: 'sync',
            tenantId: tenant.id,
            startDate,
            endDate,
          },
        });

        if (error) {
          console.error(`Error syncing costs for tenant ${tenant.id}:`, error);
          
          // Update sync log with error
          if (syncLog) {
            await supabaseClient
              .from('azure_sync_logs')
              .update({
                status: 'failed',
                completed_at: new Date().toISOString(),
                error_message: error.message || 'Unknown error',
              })
              .eq('id', syncLog.id);
          }
        } else {
          console.log(`Synced ${data?.count || 0} cost records for tenant ${tenant.name}`);
          
          // Update sync log with success
          if (syncLog) {
            await supabaseClient
              .from('azure_sync_logs')
              .update({
                status: 'success',
                completed_at: new Date().toISOString(),
                records_processed: data?.count || 0,
              })
              .eq('id', syncLog.id);
          }
        }
      } catch (err) {
        console.error(`Exception syncing costs for tenant ${tenant.id}:`, err);
        
        // Update sync log with error
        if (syncLog) {
          await supabaseClient
            .from('azure_sync_logs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: err instanceof Error ? err.message : 'Unknown error',
            })
            .eq('id', syncLog.id);
        }
      }
    }

    console.log("Azure cost sync background task completed");
  } catch (error) {
    console.error("Azure sync costs background error:", error);
  }
}

// This is a cron job handler that syncs cost data for all enabled Azure tenants
// Uses background processing to avoid timeout issues with pg_net

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Azure cost sync cron job triggered - starting background task...");

  // Start background task without awaiting
  EdgeRuntime.waitUntil(performCostSync());

  // Return immediate acknowledgment
  return new Response(
    JSON.stringify({
      success: true,
      message: "Cost sync job started in background",
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
