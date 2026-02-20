import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for Supabase edge functions
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    throw new Error(`Failed to acquire Azure token: ${response.status}`);
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

// Metric definitions by resource type
const RESOURCE_METRICS: Record<string, string[]> = {
  // Web Apps use CpuTime (seconds) and AverageMemoryWorkingSet (bytes), not percentages
  "Microsoft.Web/sites": ["CpuTime", "AverageMemoryWorkingSet", "Requests", "AverageResponseTime", "Http5xx"],
  "Microsoft.Sql/servers/databases": ["cpu_percent", "dtu_consumption_percent", "storage_percent", "connection_successful"],
  "Microsoft.Compute/virtualMachines": ["Percentage CPU", "Network In Total", "Network Out Total", "Disk Read Bytes", "Disk Write Bytes"],
  "Microsoft.Storage/storageAccounts": ["UsedCapacity", "Transactions", "Ingress", "Egress"],
};

// Minimum supported intervals by resource type (some resources don't support 5-minute granularity)
const RESOURCE_MIN_INTERVALS: Record<string, string> = {
  "Microsoft.Storage/storageAccounts": "PT1H", // Storage only supports 1-hour minimum
};

// Calculate interval based on timespan and resource type for optimal data granularity
function getIntervalForTimespan(timespan: string, resourceType?: string): string {
  // Check if resource type has a minimum interval requirement
  if (resourceType && RESOURCE_MIN_INTERVALS[resourceType]) {
    return RESOURCE_MIN_INTERVALS[resourceType];
  }
  
  // For historical data, use coarser granularity
  if (timespan.startsWith("P")) {
    const days = parseInt(timespan.replace("P", "").replace("D", ""));
    if (days >= 30) return "PT1H"; // Hourly for 30+ days
    if (days >= 7) return "PT15M"; // 15 min for 7+ days
    return "PT5M"; // 5 min for less than 7 days
  }
  // For PT (hours) format
  return "PT5M";
}

// Fetch metrics for a resource
async function fetchResourceMetrics(
  token: string,
  resourceId: string,
  metricNames: string[],
  timespan: string = "PT1H",
  resourceType?: string
// deno-lint-ignore no-explicit-any
): Promise<any[]> {
  const metricsParam = metricNames.join(",");
  const interval = getIntervalForTimespan(timespan, resourceType);
  const url = `https://management.azure.com${resourceId}/providers/microsoft.insights/metrics?api-version=2023-10-01&metricnames=${encodeURIComponent(metricsParam)}&timespan=${timespan}&interval=${interval}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Metrics API error for ${resourceId}:`, errorText);
    return [];
  }

  const data = await response.json();
  // deno-lint-ignore no-explicit-any
  const metrics: any[] = [];

  // deno-lint-ignore no-explicit-any
  data.value?.forEach((metric: any) => {
    // deno-lint-ignore no-explicit-any
    metric.timeseries?.forEach((ts: any) => {
      // deno-lint-ignore no-explicit-any
      ts.data?.forEach((point: any) => {
        if (point.average !== undefined || point.total !== undefined) {
          metrics.push({
            metric_name: metric.name.value,
            // Handle NULL namespace - fallback to metric name or default
            metric_namespace: metric.namespace || metric.name?.localizedValue || 'azure.metrics',
            timestamp_utc: point.timeStamp,
            average: point.average,
            minimum: point.minimum,
            maximum: point.maximum,
            total: point.total,
            count: point.count,
            unit: metric.unit,
          });
        }
      });
    });
  });

  return metrics;
}

// Upsert metrics to database
async function upsertMetrics(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  resourceId: string,
  // deno-lint-ignore no-explicit-any
  metrics: any[]
): Promise<number> {
  if (metrics.length === 0) return 0;

  const insertData = metrics.map((m) => ({
    azure_resource_id: resourceId,
    metric_name: m.metric_name,
    metric_namespace: m.metric_namespace,
    timestamp_utc: m.timestamp_utc,
    average: m.average,
    minimum: m.minimum,
    maximum: m.maximum,
    total: m.total,
    count: m.count,
    unit: m.unit,
  }));

  const { error: upsertError } = await supabaseClient
    .from("azure_metrics")
    .upsert(insertData, { 
      onConflict: 'azure_resource_id,metric_name,timestamp_utc',
      ignoreDuplicates: false 
    });

  if (upsertError) {
    console.error(`Upsert error for resource ${resourceId}:`, upsertError);
    return 0;
  }

  return insertData.length;
}

// Chunk detail interface for granular progress tracking
interface ChunkDetail {
  chunk_index: number;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  records: number;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
}

// Helper function to fetch all resources with pagination (handles >1000 resources)
async function fetchAllResourcesByType(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  tenantId: string,
  resourceTypes: string[]
): Promise<{ id: string; azure_resource_id: string; resource_type: string; name: string }[]> {
  const BATCH_SIZE = 1000;
  // deno-lint-ignore no-explicit-any
  let allResources: any[] = [];
  let offset = 0;
  let hasMore = true;

  console.log(`[azure-metrics] Fetching resources with pagination for tenant ${tenantId}`);

  while (hasMore) {
    const { data, error } = await supabaseClient
      .from("azure_resources")
      .select("id, azure_resource_id, resource_type, name")
      .eq("azure_tenant_id", tenantId)
      .in("resource_type", resourceTypes)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch resources: ${error.message}`);
    }
    
    if (data && data.length > 0) {
      allResources = [...allResources, ...data];
      hasMore = data.length === BATCH_SIZE;
      offset += BATCH_SIZE;
      console.log(`[azure-metrics] Fetched ${allResources.length} resources so far...`);
    } else {
      hasMore = false;
    }
  }
  
  console.log(`[azure-metrics] Total resources fetched: ${allResources.length}`);
  return allResources;
}

// Helper function to fetch all resources for a tenant (no type filter) with pagination
async function fetchAllResourcesForTenant(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  tenantId: string
): Promise<{ id: string; name: string; resource_type: string }[]> {
  const BATCH_SIZE = 1000;
  // deno-lint-ignore no-explicit-any
  let allResources: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseClient
      .from("azure_resources")
      .select("id, name, resource_type")
      .eq("azure_tenant_id", tenantId)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch resources: ${error.message}`);
    }
    
    if (data && data.length > 0) {
      allResources = [...allResources, ...data];
      hasMore = data.length === BATCH_SIZE;
      offset += BATCH_SIZE;
    } else {
      hasMore = false;
    }
  }
  
  return allResources;
}

// Helper function to fetch all metrics for multiple resources with pagination
async function fetchAllMetricsForResources(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  resourceIds: string[]
  // deno-lint-ignore no-explicit-any
): Promise<any[]> {
  const BATCH_SIZE = 1000;
  // deno-lint-ignore no-explicit-any
  let allMetrics: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseClient
      .from("azure_metrics")
      .select("*")
      .in("azure_resource_id", resourceIds)
      .order("timestamp_utc", { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }
    
    if (data && data.length > 0) {
      allMetrics = [...allMetrics, ...data];
      hasMore = data.length === BATCH_SIZE;
      offset += BATCH_SIZE;
    } else {
      hasMore = false;
    }
  }
  
  return allMetrics;
}

// Update sync progress in database with granular tracking
async function updateSyncProgress(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  progressId: string,
  updates: {
    status?: string;
    completed_chunks?: number;
    records_synced?: number;
    error_message?: string;
    completed_at?: string;
    current_operation?: string | null;
    current_resource_name?: string | null;
    failed_chunks?: number;
    processing_rate?: number;
    estimated_completion_at?: string;
    chunk_details?: string;
  }
) {
  const { error } = await supabaseClient
    .from("azure_sync_progress")
    .update(updates)
    .eq("id", progressId);

  if (error) {
    console.error("Failed to update sync progress:", error);
  }
}

// Process a single metrics chunk and chain to next chunk
async function processSingleMetricsChunk(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  progressId: string,
  tenantId: string,
  clientSecretId: string,
  // deno-lint-ignore no-explicit-any
  resources: any[],
  timespan: string,
  chunkIndex: number,
  totalRecordsSoFar: number,
  completedChunksSoFar: number,
  failedChunksSoFar: number,
  startTime: number,
  chunkDetails: ChunkDetail[]
) {
  const resource = resources[chunkIndex];
  const metricNames = RESOURCE_METRICS[resource.resource_type] || [];
  
  console.log(`[azure-metrics] Processing chunk ${chunkIndex + 1}/${resources.length}: ${resource.name}`);
  
  try {
    // Skip resources with no metric definitions
    if (metricNames.length === 0) {
      console.log(`[azure-metrics] No metrics defined for resource type ${resource.resource_type}, skipping`);
      chunkDetails[chunkIndex].status = 'completed';
      chunkDetails[chunkIndex].records = 0;
      chunkDetails[chunkIndex].completed_at = new Date().toISOString();
      
      const newCompletedChunks = completedChunksSoFar + 1;
      
      await updateSyncProgress(supabaseClient, progressId, {
        completed_chunks: newCompletedChunks,
        chunk_details: JSON.stringify(chunkDetails),
      });
      
      // Chain to next chunk
      if (chunkIndex < resources.length - 1) {
        triggerNextMetricsChunk(
          tenantId, progressId, clientSecretId, resources, timespan,
          chunkIndex + 1, totalRecordsSoFar, newCompletedChunks, failedChunksSoFar, startTime, chunkDetails
        );
      } else {
        await finishMetricsSync(supabaseClient, progressId, totalRecordsSoFar, newCompletedChunks, failedChunksSoFar, chunkDetails);
      }
      
      return { success: true, records: 0 };
    }
    
    // Get fresh token for each chunk to avoid expiration
    const clientSecret = await getClientSecretFromVault(supabaseClient, clientSecretId);
    
    // Get tenant details for token
    const { data: tenant, error: tenantError } = await supabaseClient
      .from("azure_tenants")
      .select("tenant_id, client_id")
      .eq("id", tenantId)
      .single();
    
    if (tenantError || !tenant) {
      throw new Error(`Failed to get tenant: ${tenantError?.message}`);
    }
    
    const token = await getAzureToken(tenant.tenant_id, tenant.client_id, clientSecret);
    
    // Update chunk to running
    chunkDetails[chunkIndex].status = 'running';
    chunkDetails[chunkIndex].started_at = new Date().toISOString();
    
    await updateSyncProgress(supabaseClient, progressId, {
      current_operation: 'Fetching metrics',
      current_resource_name: resource.name,
      chunk_details: JSON.stringify(chunkDetails),
    });
    
    // Fetch and upsert metrics
    console.log(`[azure-metrics] Fetching metrics for ${resource.name} (${resource.resource_type})`);
    const metrics = await fetchResourceMetrics(
      token,
      resource.azure_resource_id,
      metricNames,
      timespan,
      resource.resource_type
    );
    
    const recordCount = await upsertMetrics(supabaseClient, resource.id, metrics);
    
    // Update counters
    const newTotalRecords = totalRecordsSoFar + recordCount;
    const newCompletedChunks = completedChunksSoFar + 1;
    
    // Update chunk detail
    chunkDetails[chunkIndex].status = 'completed';
    chunkDetails[chunkIndex].records = recordCount;
    chunkDetails[chunkIndex].completed_at = new Date().toISOString();
    
    // Calculate rate and ETA
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const processingRate = elapsedSeconds > 0 ? newTotalRecords / elapsedSeconds : 0;
    const remainingChunks = resources.length - (newCompletedChunks + failedChunksSoFar);
    const avgSecondsPerChunk = elapsedSeconds / (newCompletedChunks + failedChunksSoFar);
    const estimatedCompletion = new Date(Date.now() + (remainingChunks * avgSecondsPerChunk * 1000));
    
    await updateSyncProgress(supabaseClient, progressId, {
      completed_chunks: newCompletedChunks,
      records_synced: newTotalRecords,
      failed_chunks: failedChunksSoFar,
      processing_rate: Math.round(processingRate * 100) / 100,
      estimated_completion_at: estimatedCompletion.toISOString(),
      chunk_details: JSON.stringify(chunkDetails),
    });
    
    console.log(`[azure-metrics] Chunk ${chunkIndex + 1} completed: ${recordCount} metrics synced`);
    
    // Check if there are more chunks to process
    if (chunkIndex < resources.length - 1) {
      triggerNextMetricsChunk(
        tenantId, progressId, clientSecretId, resources, timespan,
        chunkIndex + 1, newTotalRecords, newCompletedChunks, failedChunksSoFar, startTime, chunkDetails
      );
    } else {
      await finishMetricsSync(supabaseClient, progressId, newTotalRecords, newCompletedChunks, failedChunksSoFar, chunkDetails);
    }
    
    return { success: true, records: recordCount };
    
  } catch (error) {
    console.error(`[azure-metrics] Error processing chunk ${resource.name}:`, error);
    
    // Update chunk detail with error
    chunkDetails[chunkIndex].status = 'failed';
    chunkDetails[chunkIndex].error = error instanceof Error ? error.message : 'Unknown error';
    chunkDetails[chunkIndex].completed_at = new Date().toISOString();
    
    const newFailedChunks = failedChunksSoFar + 1;
    
    await updateSyncProgress(supabaseClient, progressId, {
      failed_chunks: newFailedChunks,
      chunk_details: JSON.stringify(chunkDetails),
    });
    
    // Continue with next chunk even after failure
    if (chunkIndex < resources.length - 1) {
      triggerNextMetricsChunk(
        tenantId, progressId, clientSecretId, resources, timespan,
        chunkIndex + 1, totalRecordsSoFar, completedChunksSoFar, newFailedChunks, startTime, chunkDetails
      );
    } else {
      await finishMetricsSync(supabaseClient, progressId, totalRecordsSoFar, completedChunksSoFar, newFailedChunks, chunkDetails);
    }
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Trigger next metrics chunk via edge function invoke
function triggerNextMetricsChunk(
  tenantId: string,
  progressId: string,
  clientSecretId: string,
  // deno-lint-ignore no-explicit-any
  resources: any[],
  timespan: string,
  nextChunkIndex: number,
  totalRecords: number,
  completedChunks: number,
  failedChunks: number,
  startTime: number,
  chunkDetails: ChunkDetail[]
) {
  console.log(`[azure-metrics] Triggering next chunk ${nextChunkIndex + 1}/${resources.length}...`);
  
  const nextChunkPayload = {
    action: 'historical-sync-chunk',
    tenantId,
    progressId,
    clientSecretId,
    resources,
    timespan,
    chunkIndex: nextChunkIndex,
    totalRecords,
    completedChunks,
    failedChunks,
    startTime,
    chunkDetails,
  };
  
  EdgeRuntime.waitUntil(
    (async () => {
      // Wait 2 seconds before starting next chunk to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      await fetch(`${supabaseUrl}/functions/v1/azure-metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(nextChunkPayload),
      });
    })()
  );
}

// Finish metrics sync
async function finishMetricsSync(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  progressId: string,
  totalRecords: number,
  completedChunks: number,
  failedChunks: number,
  chunkDetails: ChunkDetail[]
) {
  const totalChunks = completedChunks + failedChunks;
  await updateSyncProgress(supabaseClient, progressId, {
    status: failedChunks === totalChunks ? "failed" : "completed",
    completed_chunks: completedChunks,
    records_synced: totalRecords,
    failed_chunks: failedChunks,
    current_operation: null,
    current_resource_name: null,
    completed_at: new Date().toISOString(),
    chunk_details: JSON.stringify(chunkDetails),
  });
  
  console.log(`[azure-metrics] Historical sync completed: ${totalRecords} total metrics, ${failedChunks} failed chunks`);
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
    const { action, tenantId, resourceId, timespan } = body;

    // Handle historical-sync-chunk action (chained invocation)
    if (action === 'historical-sync-chunk') {
      const { 
        progressId, 
        clientSecretId, 
        resources, 
        timespan: chunkTimespan,
        chunkIndex, 
        totalRecords, 
        completedChunks, 
        failedChunks, 
        startTime, 
        chunkDetails 
      } = body;
      
      console.log(`[azure-metrics] historical-sync-chunk invoked for chunk ${chunkIndex + 1}/${resources.length}`);
      
      const result = await processSingleMetricsChunk(
        supabaseClient,
        progressId,
        tenantId,
        clientSecretId,
        resources,
        chunkTimespan,
        chunkIndex,
        totalRecords,
        completedChunks,
        failedChunks,
        startTime,
        chunkDetails
      );
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "sync": {
        // Sync metrics for all resources of a tenant
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

        const clientSecret = await getClientSecretFromVault(supabaseClient, tenant.client_secret_id);
        const token = await getAzureToken(tenant.tenant_id, tenant.client_id, clientSecret);

        // Get resources that have metric definitions (with pagination for >1000 resources)
        const resourceTypes = Object.keys(RESOURCE_METRICS);
        const resources = await fetchAllResourcesByType(supabaseClient, tenantId, resourceTypes);

        let totalMetrics = 0;

        for (const resource of resources || []) {
          const metricNames = RESOURCE_METRICS[resource.resource_type] || [];
          if (metricNames.length === 0) continue;

          try {
            const metrics = await fetchResourceMetrics(
              token,
              resource.azure_resource_id,
              metricNames,
              timespan || "PT1H",
              resource.resource_type
            );

            const recordCount = await upsertMetrics(supabaseClient, resource.id, metrics);
            totalMetrics += recordCount;
          } catch (err) {
            console.error(`Error fetching metrics for ${resource.azure_resource_id}:`, err);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Synced ${totalMetrics} metric points for ${resources?.length || 0} resources`,
            metrics_count: totalMetrics,
            resources_count: resources?.length || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "historical-sync": {
        // Historical sync with progress tracking (up to 93 days)
        // Uses chaining pattern to avoid edge function timeouts
        if (!tenantId) {
          throw new Error("tenantId required for historical-sync action");
        }

        const days = body.days || 30;
        if (days > 93) {
          throw new Error("Maximum historical period is 93 days");
        }

        console.log(`[azure-metrics] Starting historical sync for tenant ${tenantId}, ${days} days`);

        // Get tenant details
        const { data: tenant, error: tenantError } = await supabaseClient
          .from("azure_tenants")
          .select("*")
          .eq("id", tenantId)
          .single();

        if (tenantError || !tenant) {
          throw new Error(`Tenant not found: ${tenantError?.message}`);
        }

        // Get resources that have metric definitions (with pagination for >1000 resources)
        const resourceTypes = Object.keys(RESOURCE_METRICS);
        const resources = await fetchAllResourcesByType(supabaseClient, tenantId, resourceTypes);

        if (!resources || resources.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "No resources with supported metric types found for this tenant.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Initialize chunk details for each resource
        const chunkDetails: ChunkDetail[] = resources.map((resource, idx) => ({
          chunk_index: idx,
          label: resource.name,
          status: 'pending',
          records: 0,
          started_at: null,
          completed_at: null,
          error: null,
        }));

        // Create sync progress record
        const { data: progress, error: progressError } = await supabaseClient
          .from("azure_sync_progress")
          .insert({
            tenant_id: tenantId,
            sync_type: "metrics",
            status: "running",
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            total_chunks: resources.length,
            completed_chunks: 0,
            records_synced: 0,
            chunk_details: JSON.stringify(chunkDetails),
          })
          .select()
          .single();

        if (progressError) {
          throw new Error(`Failed to create sync progress: ${progressError.message}`);
        }

        // Azure Monitor timespan format: P{days}D
        const historicalTimespan = `P${days}D`;

        // Trigger the first chunk via chaining (non-blocking)
        triggerNextMetricsChunk(
          tenantId,
          progress.id,
          tenant.client_secret_id,
          resources,
          historicalTimespan,
          0,      // chunkIndex
          0,      // totalRecords
          0,      // completedChunks
          0,      // failedChunks
          Date.now(), // startTime
          chunkDetails
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: `Historical metrics sync started for ${days} days`,
            progressId: progress.id,
            totalResources: resources.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "resource": {
        // Get metrics for a specific resource
        if (!resourceId) {
          throw new Error("resourceId required for resource action");
        }

        const { data, error } = await supabaseClient
          .from("azure_metrics")
          .select("*")
          .eq("azure_resource_id", resourceId)
          .order("timestamp_utc", { ascending: false })
          .limit(500);

        if (error) {
          throw new Error(`Failed to fetch metrics: ${error.message}`);
        }

        // Group by metric name
        const byMetric: Record<string, typeof data> = {};
        data?.forEach((m) => {
          if (!byMetric[m.metric_name]) {
            byMetric[m.metric_name] = [];
          }
          byMetric[m.metric_name].push(m);
        });

        return new Response(
          JSON.stringify({ success: true, metrics: byMetric }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "latest": {
        // Get latest metrics for each resource in a tenant
        if (!tenantId) {
          throw new Error("tenantId required for latest action");
        }

        // Get resources (with pagination for >1000 resources)
        const resources = await fetchAllResourcesForTenant(supabaseClient, tenantId);

        const resourceIds = resources.map((r) => r.id);

        // Get latest metrics for each resource (with pagination for >1000 metrics)
        const metrics = await fetchAllMetricsForResources(supabaseClient, resourceIds);

        // Get latest metric per resource per metric name
        const latestByResource: Record<string, Record<string, typeof metrics[0]>> = {};
        metrics?.forEach((m) => {
          if (!latestByResource[m.azure_resource_id]) {
            latestByResource[m.azure_resource_id] = {};
          }
          if (!latestByResource[m.azure_resource_id][m.metric_name]) {
            latestByResource[m.azure_resource_id][m.metric_name] = m;
          }
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            resources: resources?.map((r) => ({
              ...r,
              metrics: latestByResource[r.id] || {},
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Azure metrics error:", error);
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
