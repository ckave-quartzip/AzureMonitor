import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout for individual sync operations (55 seconds - allow more time for batched processing)
const OPERATION_TIMEOUT_MS = 55000;

// Helper to add timeout to a promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operationName: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]).catch(err => {
    console.error(`[azure-sync-sql-insights] ${operationName} failed:`, err.message);
    return null;
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[azure-sync-sql-insights] Starting SQL insights sync for all tenants');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, clean up any stuck jobs from previous runs
    const { data: cleanedCount } = await supabase.rpc('cleanup_stuck_sync_jobs');
    if (cleanedCount && cleanedCount > 0) {
      console.log(`[azure-sync-sql-insights] Cleaned up ${cleanedCount} stuck jobs`);
    }

    // Fetch all enabled Azure tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('azure_tenants')
      .select('id, name')
      .eq('is_enabled', true);

    if (tenantsError) {
      console.error('[azure-sync-sql-insights] Error fetching tenants:', tenantsError);
      throw tenantsError;
    }

    console.log(`[azure-sync-sql-insights] Found ${tenants?.length || 0} enabled tenants`);

    const results = [];
    let totalResourcesProcessed = 0;

    for (const tenant of tenants || []) {
      console.log(`[azure-sync-sql-insights] Processing tenant: ${tenant.name} (${tenant.id})`);
      
      // Create sync log entry
      const { data: syncLog, error: logError } = await supabase
        .from('azure_sync_logs')
        .insert({
          azure_tenant_id: tenant.id,
          sync_type: 'sql-insights',
          status: 'running',
        })
        .select()
        .single();

      if (logError) {
        console.error(`[azure-sync-sql-insights] Error creating sync log for tenant ${tenant.id}:`, logError);
        continue;
      }

      try {
        // Run all sync operations in PARALLEL with individual timeouts
        console.log(`[azure-sync-sql-insights] Starting parallel sync operations for tenant ${tenant.name}`);
        
        const [data, perfData, replData, waitData, queryData] = await Promise.all([
          // Sync SQL databases
          withTimeout(
            supabase.functions.invoke('azure-sql-insights', {
              body: { action: 'sync', tenantId: tenant.id },
            }).then(res => res.data),
            OPERATION_TIMEOUT_MS,
            'sync'
          ),
          
          // Sync performance stats
          withTimeout(
            supabase.functions.invoke('azure-sql-insights', {
              body: { action: 'sync-performance', tenantId: tenant.id },
            }).then(res => res.data),
            OPERATION_TIMEOUT_MS,
            'sync-performance'
          ),
          
          // Sync replication links
          withTimeout(
            supabase.functions.invoke('azure-sql-insights', {
              body: { action: 'sync-replication', tenantId: tenant.id },
            }).then(res => res.data),
            OPERATION_TIMEOUT_MS,
            'sync-replication'
          ),
          
          // Sync wait stats
          withTimeout(
            supabase.functions.invoke('azure-sql-insights', {
              body: { action: 'sync-wait-stats', tenantId: tenant.id },
            }).then(res => res.data),
            OPERATION_TIMEOUT_MS,
            'sync-wait-stats'
          ),
          
          // Sync query insights
          withTimeout(
            supabase.functions.invoke('azure-sql-insights', {
              body: { action: 'sync-query-insights', tenantId: tenant.id },
            }).then(res => res.data),
            OPERATION_TIMEOUT_MS,
            'sync-query-insights'
          ),
        ]);

        const resourceCount = 
          (data?.syncedCount || 0) + 
          (perfData?.syncedCount || 0) + 
          (replData?.syncedCount || 0) + 
          (waitData?.syncedCount || 0) + 
          (queryData?.syncedCount || 0);
        
        totalResourcesProcessed += resourceCount;

        // Determine if any operations failed
        const failedOps = [];
        if (!data) failedOps.push('sync');
        if (!perfData) failedOps.push('performance');
        if (!replData) failedOps.push('replication');
        if (!waitData) failedOps.push('waitStats');
        if (!queryData) failedOps.push('queryInsights');

        const status = failedOps.length === 5 ? 'failed' : failedOps.length > 0 ? 'completed' : 'completed';
        const errorMessage = failedOps.length > 0 ? `Some operations timed out: ${failedOps.join(', ')}` : null;

        // Update sync log as completed
        await supabase
          .from('azure_sync_logs')
          .update({
            status,
            completed_at: new Date().toISOString(),
            records_processed: resourceCount,
            error_message: errorMessage,
            details: { 
              message: failedOps.length > 0 ? 'Sync completed with some timeouts' : 'Sync completed',
              databases: data?.syncedCount || 0,
              performance: perfData?.syncedCount || 0,
              replication: replData?.syncedCount || 0,
              waitStats: waitData?.syncedCount || 0,
              queryInsights: queryData?.syncedCount || 0,
              failedOperations: failedOps.length > 0 ? failedOps : undefined,
            },
          })
          .eq('id', syncLog.id);

        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          status: failedOps.length === 5 ? 'failed' : 'success',
          resourcesProcessed: resourceCount,
          failedOperations: failedOps.length > 0 ? failedOps : undefined,
        });

        console.log(`[azure-sync-sql-insights] Completed sync for tenant ${tenant.name}: ${resourceCount} resources (db: ${data?.syncedCount || 0}, perf: ${perfData?.syncedCount || 0}, repl: ${replData?.syncedCount || 0}, wait: ${waitData?.syncedCount || 0}, query: ${queryData?.syncedCount || 0})${failedOps.length > 0 ? ` - Timeouts: ${failedOps.join(', ')}` : ''}`);
      } catch (syncError) {
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
        console.error(`[azure-sync-sql-insights] Error syncing tenant ${tenant.id}:`, syncError);
        
        // Update sync log as failed
        await supabase
          .from('azure_sync_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
          })
          .eq('id', syncLog.id);

        results.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    console.log(`[azure-sync-sql-insights] Sync completed. Total resources processed: ${totalResourcesProcessed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `SQL insights sync completed for ${tenants?.length || 0} tenants`,
        totalResourcesProcessed,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('[azure-sync-sql-insights] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
