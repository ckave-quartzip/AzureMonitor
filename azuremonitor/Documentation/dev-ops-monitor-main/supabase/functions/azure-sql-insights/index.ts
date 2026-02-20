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

// Constants for batched processing
const BATCH_SIZE = 5; // Process 5 databases in parallel
const MAX_EXECUTION_TIME_MS = 50000; // Exit gracefully before 60s edge function limit

// Helper to check if we should stop processing
function shouldStopProcessing(startTime: number): boolean {
  return Date.now() - startTime > MAX_EXECUTION_TIME_MS;
}

// Helper to process items in parallel batches
async function processBatched<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number,
  startTime: number
): Promise<{ results: R[]; processedCount: number; timedOut: boolean }> {
  const results: R[] = [];
  let processedCount = 0;
  let timedOut = false;

  for (let i = 0; i < items.length; i += batchSize) {
    // Check if we should stop
    if (shouldStopProcessing(startTime)) {
      console.log(`[azure-sql-insights] Approaching timeout, processed ${processedCount}/${items.length} items`);
      timedOut = true;
      break;
    }

    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          return await processor(item);
        } catch (err) {
          console.error(`[azure-sql-insights] Error processing item:`, err);
          return null as unknown as R;
        }
      })
    );
    
    results.push(...batchResults.filter(r => r !== null));
    processedCount += batch.length;
  }

  return { results, processedCount, timedOut };
}

// Helper function to fetch all SQL resources with pagination (handles >1000 resources)
async function fetchAllSqlResources(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  tenantId: string,
  selectFields: string = "id, name, azure_resource_id"
  // deno-lint-ignore no-explicit-any
): Promise<any[]> {
  const RESOURCE_BATCH_SIZE = 1000;
  // deno-lint-ignore no-explicit-any
  let allResources: any[] = [];
  let offset = 0;
  let hasMore = true;

  console.log(`[azure-sql-insights] Fetching SQL resources with pagination for tenant ${tenantId}`);

  while (hasMore) {
    const { data, error } = await supabaseClient
      .from("azure_resources")
      .select(selectFields)
      .eq("azure_tenant_id", tenantId)
      .or("resource_type.ilike.%sql%,resource_type.ilike.%database%")
      .range(offset, offset + RESOURCE_BATCH_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch SQL resources: ${error.message}`);
    }
    
    if (data && data.length > 0) {
      allResources = [...allResources, ...data];
      hasMore = data.length === RESOURCE_BATCH_SIZE;
      offset += RESOURCE_BATCH_SIZE;
      console.log(`[azure-sql-insights] Fetched ${allResources.length} SQL resources so far...`);
    } else {
      hasMore = false;
    }
  }
  
  console.log(`[azure-sql-insights] Total SQL resources fetched: ${allResources.length}`);
  return allResources;
}

// Log Analytics API uses a different OAuth scope
async function getLogAnalyticsToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://api.loganalytics.io/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[azure-sql-insights] Log Analytics token error:", errorText);
    throw new Error(`Failed to get Log Analytics token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Extract just the database name from a resource name like "server/database"
function extractDatabaseName(resourceName: string): string {
  if (resourceName.includes('/')) {
    return resourceName.split('/').pop() || resourceName;
  }
  return resourceName;
}

interface WaitStatResult {
  wait_type: string;
  wait_time_ms: number;
  wait_count: number;
  avg_wait_time_ms: number;
  max_wait_time_ms: number;
}

// Fetch wait stats from Log Analytics using KQL
async function fetchWaitStatsFromLogAnalytics(
  token: string,
  workspaceId: string,
  databaseName: string,
  lookbackHours: number = 24
): Promise<WaitStatResult[]> {
  const dbName = extractDatabaseName(databaseName);
  console.log(`[azure-sql-insights] Querying wait stats for database: ${dbName}`);
  
  const kqlFull = `
AzureDiagnostics
| where Category == "QueryStoreWaitStatistics"
| where DatabaseName_s == "${dbName}"
| where TimeGenerated > ago(${lookbackHours}h)
| summarize 
    wait_time_ms = sum(todouble(total_query_wait_time_ms_d)),
    wait_count = sum(toint(total_wait_count_d)),
    max_wait_time_ms = max(todouble(max_query_wait_time_ms_d))
  by wait_category_s
| extend avg_wait_time_ms = iif(wait_count > 0, wait_time_ms / wait_count, 0.0)
| project 
    wait_type = wait_category_s,
    wait_time_ms,
    wait_count,
    avg_wait_time_ms,
    max_wait_time_ms
| order by wait_time_ms desc
| take 20
`;

  const kqlFallback = `
AzureDiagnostics
| where Category == "QueryStoreWaitStatistics"
| where DatabaseName_s == "${dbName}"
| where TimeGenerated > ago(${lookbackHours}h)
| summarize 
    wait_time_ms = sum(todouble(total_query_wait_time_ms_d))
  by wait_category_s
| extend wait_count = 0, avg_wait_time_ms = 0.0, max_wait_time_ms = wait_time_ms
| project 
    wait_type = wait_category_s,
    wait_time_ms,
    wait_count,
    avg_wait_time_ms,
    max_wait_time_ms
| order by wait_time_ms desc
| take 20
`;

  const executeQuery = async (kql: string) => {
    return await fetch(`https://api.loganalytics.io/v1/workspaces/${workspaceId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: kql }),
    });
  };

  try {
    let response = await executeQuery(kqlFull);

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 400 && errorText.includes("SEM0100")) {
        response = await executeQuery(kqlFallback);
        if (!response.ok) {
          return [];
        }
      } else {
        return [];
      }
    }

    const data = await response.json();
    
    if (!data.tables || data.tables.length === 0 || !data.tables[0].rows) {
      return [];
    }

    const table = data.tables[0];
    const columns = table.columns.map((c: { name: string }) => c.name);
    
    const results: WaitStatResult[] = table.rows.map((row: (string | number)[]) => {
      const rowObj: Record<string, string | number> = {};
      columns.forEach((col: string, i: number) => {
        rowObj[col] = row[i];
      });
      return {
        wait_type: String(rowObj["wait_type"] || "Unknown"),
        wait_time_ms: Number(rowObj["wait_time_ms"]) || 0,
        wait_count: Number(rowObj["wait_count"]) || 0,
        avg_wait_time_ms: Number(rowObj["avg_wait_time_ms"]) || 0,
        max_wait_time_ms: Number(rowObj["max_wait_time_ms"]) || 0,
      };
    });

    return results;
  } catch (error) {
    console.error("[azure-sql-insights] Error fetching wait stats:", error);
    return [];
  }
}

// Fetch all query texts from Query Store for a database
async function fetchAllQueryTextsFromQueryStore(
  token: string,
  resourceId: string
): Promise<Map<string, string>> {
  const queryTextMap = new Map<string, string>();
  
  try {
    const url = `https://management.azure.com${resourceId}/queries?api-version=2021-11-01&$top=100`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return queryTextMap;
    }

    const data = await response.json();
    
    for (const query of data.value || []) {
      const hash = query.properties?.queryHash || query.queryHash;
      const text = query.properties?.queryText || query.queryText;
      if (hash && text) {
        queryTextMap.set(hash, text);
      }
    }
    
    return queryTextMap;
  } catch (error) {
    console.error(`[azure-sql-insights] Error fetching query texts:`, error);
    return queryTextMap;
  }
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

// Fetch query stats from Azure SQL
async function fetchQueryStats(
  token: string,
  resourceId: string
// deno-lint-ignore no-explicit-any
): Promise<any[]> {
  const url = `https://management.azure.com${resourceId}/queries?api-version=2021-11-01`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.value || [];
}

// Fetch recommendations from Azure Advisor
async function fetchSqlRecommendations(
  token: string,
  subscriptionId: string,
  resourceId: string
// deno-lint-ignore no-explicit-any
): Promise<any[]> {
  const url = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Advisor/recommendations?api-version=2020-01-01&$filter=ResourceId eq '${resourceId}'`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return data.value || [];
}

// Fetch SQL performance metrics
async function fetchSqlPerformanceMetrics(
  token: string,
  resourceId: string
// deno-lint-ignore no-explicit-any
): Promise<any> {
  const metricNames = 'cpu_percent,dtu_consumption_percent,storage_percent,storage,allocated_data_storage,connection_successful,connection_failed,sessions_percent,workers_percent,log_write_percent,physical_data_read_percent';
  const timespan = 'PT1H';
  const url = `https://management.azure.com${resourceId}/providers/microsoft.insights/metrics?api-version=2023-10-01&metricnames=${metricNames}&timespan=${timespan}&interval=PT5M`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.value || [];
}

// Fetch geo-replication links for a database
async function fetchReplicationLinks(
  token: string,
  resourceId: string
// deno-lint-ignore no-explicit-any
): Promise<any[]> {
  const url = `https://management.azure.com${resourceId}/replicationLinks?api-version=2022-05-01-preview`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    return [];
  }

  const data = await response.json();
  return data.value || [];
}

// Parse metrics into performance stats
// deno-lint-ignore no-explicit-any
function parsePerformanceMetrics(metrics: any[]): any {
  const result = {
    cpu_percent: null as number | null,
    dtu_percent: null as number | null,
    storage_percent: null as number | null,
    deadlock_count: 0,
    blocked_count: 0,
    connection_count: null as number | null,
    timestamp_utc: new Date().toISOString(),
    data_space_used_bytes: null as number | null,
    data_space_allocated_bytes: null as number | null,
    log_space_used_bytes: null as number | null,
    log_space_used_percent: null as number | null,
    max_size_bytes: null as number | null,
  };

  for (const metric of metrics) {
    const name = metric.name?.value?.toLowerCase() || '';
    const timeseries = metric.timeseries?.[0]?.data || [];
    const latestValue = timeseries[timeseries.length - 1];

    if (!latestValue) continue;

    const value = latestValue.average ?? latestValue.total ?? latestValue.count ?? 0;

    if (name === 'cpu_percent') {
      result.cpu_percent = value;
      result.timestamp_utc = latestValue.timeStamp;
    } else if (name === 'dtu_consumption_percent') {
      result.dtu_percent = value;
    } else if (name === 'storage_percent') {
      result.storage_percent = value;
    } else if (name === 'storage') {
      result.data_space_used_bytes = Math.round(value);
    } else if (name === 'allocated_data_storage') {
      result.data_space_allocated_bytes = Math.round(value);
    } else if (name === 'log_write_percent') {
      result.log_space_used_percent = value;
    } else if (name === 'connection_successful') {
      result.connection_count = (result.connection_count || 0) + Math.round(value);
    }
  }

  return result;
}

// Fetch query runtime stats from Log Analytics
async function fetchQueryStatsFromLogAnalytics(
  token: string,
  workspaceId: string,
  databaseName: string,
  lookbackHours: number = 24
// deno-lint-ignore no-explicit-any
): Promise<any[]> {
  const dbName = extractDatabaseName(databaseName);
  
  const kqlWithQueryText = `
let QueryText = AzureDiagnostics
| where Category == "QueryStoreQueries"
| where DatabaseName_s == "${dbName}"
| where TimeGenerated > ago(${lookbackHours}h)
| summarize query_sql_text = take_any(query_sql_text_s) by query_hash_s;

AzureDiagnostics
| where Category == "QueryStoreRuntimeStatistics"
| where DatabaseName_s == "${dbName}"
| where TimeGenerated > ago(${lookbackHours}h)
| summarize 
    execution_count = sum(toint(count_executions_d)),
    total_cpu_time_ms = sum(todouble(cpu_time_d)) / 1000,
    total_duration_ms = sum(todouble(duration_d)) / 1000,
    total_logical_reads = sum(todouble(logical_io_reads_d)),
    total_logical_writes = sum(todouble(logical_io_writes_d)),
    last_execution_time = max(TimeGenerated)
  by query_hash_s
| lookup kind=leftouter QueryText on query_hash_s
| extend 
    avg_cpu_time_ms = iif(execution_count > 0, total_cpu_time_ms / execution_count, 0.0),
    avg_duration_ms = iif(execution_count > 0, total_duration_ms / execution_count, 0.0),
    avg_logical_reads = iif(execution_count > 0, total_logical_reads / execution_count, 0.0),
    avg_logical_writes = iif(execution_count > 0, total_logical_writes / execution_count, 0.0)
| project 
    query_hash = query_hash_s,
    query_text = query_sql_text,
    execution_count,
    total_cpu_time_ms,
    avg_cpu_time_ms,
    total_duration_ms,
    avg_duration_ms,
    total_logical_reads,
    avg_logical_reads,
    total_logical_writes,
    avg_logical_writes,
    last_execution_time
| order by total_cpu_time_ms desc
| take 50
`;

  const kqlFallback = `
AzureDiagnostics
| where Category == "QueryStoreRuntimeStatistics"
| where DatabaseName_s == "${dbName}"
| where TimeGenerated > ago(${lookbackHours}h)
| summarize 
    execution_count = sum(toint(count_executions_d)),
    total_cpu_time_ms = sum(todouble(cpu_time_d)) / 1000,
    total_duration_ms = sum(todouble(duration_d)) / 1000,
    total_logical_reads = sum(todouble(logical_io_reads_d)),
    total_logical_writes = sum(todouble(logical_io_writes_d)),
    last_execution_time = max(TimeGenerated)
  by query_hash_s
| extend 
    query_text = "",
    avg_cpu_time_ms = iif(execution_count > 0, total_cpu_time_ms / execution_count, 0.0),
    avg_duration_ms = iif(execution_count > 0, total_duration_ms / execution_count, 0.0),
    avg_logical_reads = iif(execution_count > 0, total_logical_reads / execution_count, 0.0),
    avg_logical_writes = iif(execution_count > 0, total_logical_writes / execution_count, 0.0)
| project 
    query_hash = query_hash_s,
    query_text,
    execution_count,
    total_cpu_time_ms,
    avg_cpu_time_ms,
    total_duration_ms,
    avg_duration_ms,
    total_logical_reads,
    avg_logical_reads,
    total_logical_writes,
    avg_logical_writes,
    last_execution_time
| order by total_cpu_time_ms desc
| take 50
`;

  async function executeKqlQuery(kql: string): Promise<Response> {
    return await fetch(`https://api.loganalytics.io/v1/workspaces/${workspaceId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: kql }),
    });
  }

  try {
    let response = await executeKqlQuery(kqlWithQueryText);

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 400 && errorText.includes("SEM0100")) {
        response = await executeKqlQuery(kqlFallback);
        if (!response.ok) {
          return [];
        }
      } else {
        return [];
      }
    }

    const data = await response.json();
    
    if (!data.tables || data.tables.length === 0 || !data.tables[0].rows) {
      return [];
    }

    const table = data.tables[0];
    const columns = table.columns.map((c: { name: string }) => c.name);
    
    return table.rows.map((row: (string | number | null)[]) => {
      // deno-lint-ignore no-explicit-any
      const rowObj: Record<string, any> = {};
      columns.forEach((col: string, i: number) => {
        rowObj[col] = row[i];
      });
      return rowObj;
    });
  } catch (error) {
    console.error("[azure-sql-insights] Error fetching query stats:", error);
    return [];
  }
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

// Update sync progress in database
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
    console.error("[azure-sql-insights] Failed to update sync progress:", error);
  }
}

// Process a single SQL insights chunk and chain to next chunk
async function processSingleSqlInsightsChunk(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  progressId: string,
  tenantId: string,
  clientSecretId: string,
  subscriptionId: string,
  // deno-lint-ignore no-explicit-any
  workspaces: any[],
  // deno-lint-ignore no-explicit-any
  sqlResources: any[],
  lookbackHours: number,
  chunkIndex: number,
  totalRecordsSoFar: number,
  completedChunksSoFar: number,
  failedChunksSoFar: number,
  startTime: number,
  chunkDetails: ChunkDetail[]
) {
  // Calculate which workspace-resource pair this chunk represents
  const totalChunks = workspaces.length * sqlResources.length;
  const workspaceIndex = Math.floor(chunkIndex / sqlResources.length);
  const resourceIndex = chunkIndex % sqlResources.length;
  
  const workspace = workspaces[workspaceIndex];
  const resource = sqlResources[resourceIndex];
  
  console.log(`[azure-sql-insights] Processing chunk ${chunkIndex + 1}/${totalChunks}: ${resource.name} (workspace: ${workspace.workspace_name})`);
  
  try {
    // Get fresh tokens for each chunk to avoid expiration
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
    
    const logAnalyticsToken = await getLogAnalyticsToken(tenant.tenant_id, tenant.client_id, clientSecret);
    const azureToken = await getAzureToken(tenant.tenant_id, tenant.client_id, clientSecret);
    
    // Update chunk to running
    chunkDetails[chunkIndex].status = 'running';
    chunkDetails[chunkIndex].started_at = new Date().toISOString();
    
    await updateSyncProgress(supabaseClient, progressId, {
      current_operation: 'Fetching SQL insights',
      current_resource_name: resource.name,
      chunk_details: JSON.stringify(chunkDetails),
    });
    
    let chunkRecords = 0;
    
    // Fetch wait stats from Log Analytics
    const waitStats = await fetchWaitStatsFromLogAnalytics(
      logAnalyticsToken,
      workspace.workspace_id,
      resource.name,
      lookbackHours
    );

    if (waitStats.length > 0) {
      await supabaseClient
        .from("azure_sql_wait_stats")
        .delete()
        .eq("azure_resource_id", resource.id);

      const waitInserts = waitStats.map((stat) => ({
        azure_resource_id: resource.id,
        wait_type: stat.wait_type,
        wait_time_ms: stat.wait_time_ms,
        wait_count: stat.wait_count,
        avg_wait_time_ms: stat.avg_wait_time_ms,
        max_wait_time_ms: stat.max_wait_time_ms,
        collected_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      }));

      const { error: waitError } = await supabaseClient
        .from("azure_sql_wait_stats")
        .insert(waitInserts);

      if (!waitError) {
        chunkRecords += waitInserts.length;
      }
    }

    // Fetch query stats from Log Analytics
    const queryStats = await fetchQueryStatsFromLogAnalytics(
      logAnalyticsToken,
      workspace.workspace_id,
      resource.name,
      lookbackHours
    );

    if (queryStats.length > 0) {
      // Try to get query texts from Query Store if missing
      let queryTextMap = new Map<string, string>();
      const queriesWithMissingText = queryStats.filter(stat => !stat.query_text);
      
      if (queriesWithMissingText.length > 0 && resource.azure_resource_id) {
        try {
          queryTextMap = await fetchAllQueryTextsFromQueryStore(azureToken, resource.azure_resource_id);
        } catch {
          // Continue without query text
        }
      }

      await supabaseClient
        .from("azure_sql_insights")
        .delete()
        .eq("azure_resource_id", resource.id);

      const queryInserts = queryStats.map((stat) => {
        let queryText = stat.query_text || null;
        if (!queryText && stat.query_hash && queryTextMap.has(stat.query_hash)) {
          queryText = queryTextMap.get(stat.query_hash)!;
        }
        
        return {
          azure_resource_id: resource.id,
          query_hash: String(stat.query_hash || "unknown"),
          query_text: queryText,
          execution_count: Number(stat.execution_count) || 0,
          total_cpu_time_ms: Number(stat.total_cpu_time_ms) || 0,
          avg_cpu_time_ms: Number(stat.avg_cpu_time_ms) || 0,
          total_duration_ms: Number(stat.total_duration_ms) || 0,
          avg_duration_ms: Number(stat.avg_duration_ms) || 0,
          total_logical_reads: Number(stat.total_logical_reads) || 0,
          avg_logical_reads: Number(stat.avg_logical_reads) || 0,
          total_logical_writes: Number(stat.total_logical_writes) || 0,
          avg_logical_writes: Number(stat.avg_logical_writes) || 0,
          last_execution_time: stat.last_execution_time || null,
          plan_count: null,
          synced_at: new Date().toISOString(),
        };
      });

      const { error: queryError } = await supabaseClient
        .from("azure_sql_insights")
        .upsert(queryInserts, { onConflict: "azure_resource_id,query_hash" });

      if (!queryError) {
        chunkRecords += queryInserts.length;
      }
    }

    // Fetch recommendations from Azure Advisor
    try {
      const recommendations = await fetchSqlRecommendations(
        azureToken,
        subscriptionId,
        resource.azure_resource_id
      );

      if (recommendations.length > 0) {
        // deno-lint-ignore no-explicit-any
        const recInserts = recommendations.map((rec: any) => ({
          azure_resource_id: resource.id,
          recommendation_id: rec.id || crypto.randomUUID(),
          name: rec.properties?.shortDescription?.problem || rec.name || 'Recommendation',
          category: rec.properties?.category || null,
          impact: rec.properties?.impact || null,
          impacted_field: rec.properties?.impactedField || null,
          impacted_value: rec.properties?.impactedValue || null,
          problem: rec.properties?.shortDescription?.problem || null,
          solution: rec.properties?.shortDescription?.solution || null,
          is_resolved: false,
          last_seen_at: new Date().toISOString(),
        }));

        const { error: recError } = await supabaseClient
          .from("azure_sql_recommendations")
          .upsert(recInserts, { onConflict: "azure_resource_id,recommendation_id" });

        if (!recError) {
          chunkRecords += recInserts.length;
        }
      }
    } catch (recErr) {
      console.error(`[azure-sql-insights] Error fetching recommendations:`, recErr);
    }

    // Update counters
    const newTotalRecords = totalRecordsSoFar + chunkRecords;
    const newCompletedChunks = completedChunksSoFar + 1;
    
    // Update chunk detail
    chunkDetails[chunkIndex].status = 'completed';
    chunkDetails[chunkIndex].records = chunkRecords;
    chunkDetails[chunkIndex].completed_at = new Date().toISOString();
    
    // Calculate rate and ETA
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const processingRate = elapsedSeconds > 0 ? newTotalRecords / elapsedSeconds : 0;
    const remainingChunks = totalChunks - (newCompletedChunks + failedChunksSoFar);
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
    
    console.log(`[azure-sql-insights] Chunk ${chunkIndex + 1} completed: ${chunkRecords} records synced`);
    
    // Check if there are more chunks to process
    if (chunkIndex < totalChunks - 1) {
      triggerNextSqlInsightsChunk(
        tenantId, progressId, clientSecretId, subscriptionId, workspaces, sqlResources, lookbackHours,
        chunkIndex + 1, newTotalRecords, newCompletedChunks, failedChunksSoFar, startTime, chunkDetails
      );
    } else {
      await finishSqlInsightsSync(supabaseClient, progressId, newTotalRecords, newCompletedChunks, failedChunksSoFar, chunkDetails);
    }
    
    return { success: true, records: chunkRecords };
    
  } catch (error) {
    console.error(`[azure-sql-insights] Error processing chunk ${resource.name}:`, error);
    
    // Update chunk detail with error
    chunkDetails[chunkIndex].status = 'failed';
    chunkDetails[chunkIndex].error = error instanceof Error ? error.message : 'Unknown error';
    chunkDetails[chunkIndex].completed_at = new Date().toISOString();
    
    const newFailedChunks = failedChunksSoFar + 1;
    const totalChunks = workspaces.length * sqlResources.length;
    
    await updateSyncProgress(supabaseClient, progressId, {
      failed_chunks: newFailedChunks,
      chunk_details: JSON.stringify(chunkDetails),
    });
    
    // Continue with next chunk even after failure
    if (chunkIndex < totalChunks - 1) {
      triggerNextSqlInsightsChunk(
        tenantId, progressId, clientSecretId, subscriptionId, workspaces, sqlResources, lookbackHours,
        chunkIndex + 1, totalRecordsSoFar, completedChunksSoFar, newFailedChunks, startTime, chunkDetails
      );
    } else {
      await finishSqlInsightsSync(supabaseClient, progressId, totalRecordsSoFar, completedChunksSoFar, newFailedChunks, chunkDetails);
    }
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Trigger next SQL insights chunk via edge function invoke
function triggerNextSqlInsightsChunk(
  tenantId: string,
  progressId: string,
  clientSecretId: string,
  subscriptionId: string,
  // deno-lint-ignore no-explicit-any
  workspaces: any[],
  // deno-lint-ignore no-explicit-any
  sqlResources: any[],
  lookbackHours: number,
  nextChunkIndex: number,
  totalRecords: number,
  completedChunks: number,
  failedChunks: number,
  startTime: number,
  chunkDetails: ChunkDetail[]
) {
  const totalChunks = workspaces.length * sqlResources.length;
  console.log(`[azure-sql-insights] Triggering next chunk ${nextChunkIndex + 1}/${totalChunks}...`);
  
  const nextChunkPayload = {
    action: 'historical-sync-chunk',
    tenantId,
    progressId,
    clientSecretId,
    subscriptionId,
    workspaces,
    sqlResources,
    lookbackHours,
    chunkIndex: nextChunkIndex,
    totalRecords,
    completedChunks,
    failedChunks,
    startTime,
    chunkDetails,
  };
  
  EdgeRuntime.waitUntil(
    (async () => {
      // Wait 2 seconds before starting next chunk
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      await fetch(`${supabaseUrl}/functions/v1/azure-sql-insights`, {
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

// Finish SQL insights sync
async function finishSqlInsightsSync(
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
  
  console.log(`[azure-sql-insights] Historical sync completed: ${totalRecords} total records, ${failedChunks} failed chunks`);
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
    const { action, tenantId, resourceId } = body;

    // Handle historical-sync-chunk action (chained invocation)
    if (action === 'historical-sync-chunk') {
      const { 
        progressId, 
        clientSecretId, 
        subscriptionId,
        workspaces,
        sqlResources,
        lookbackHours,
        chunkIndex, 
        totalRecords, 
        completedChunks, 
        failedChunks, 
        startTime, 
        chunkDetails 
      } = body;
      
      const totalChunks = workspaces.length * sqlResources.length;
      console.log(`[azure-sql-insights] historical-sync-chunk invoked for chunk ${chunkIndex + 1}/${totalChunks}`);
      
      const result = await processSingleSqlInsightsChunk(
        supabaseClient,
        progressId,
        tenantId,
        clientSecretId,
        subscriptionId,
        workspaces,
        sqlResources,
        lookbackHours,
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
        // Sync all SQL insights for all SQL databases in tenant
        if (!tenantId) {
          throw new Error("tenantId required for sync action");
        }

        console.log(`Starting full SQL sync for tenant ${tenantId}`);

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

        // Get SQL database resources
        const { data: sqlResources, error: resourcesError } = await supabaseClient
          .from("azure_resources")
          .select("id, azure_resource_id, name, resource_type")
          .eq("azure_tenant_id", tenantId)
          .eq("resource_type", "Microsoft.Sql/servers/databases");

        if (resourcesError) {
          throw new Error(`Failed to fetch SQL resources: ${resourcesError.message}`);
        }

        let totalInsights = 0;
        let totalPerfStats = 0;
        let totalRecommendations = 0;

        for (const resource of sqlResources || []) {
          try {
            const queryStats = await fetchQueryStats(token, resource.azure_resource_id);
            
            // deno-lint-ignore no-explicit-any
            const insights = queryStats.map((q: any) => ({
              azure_resource_id: resource.id,
              query_hash: q.queryId || q.name?.value || crypto.randomUUID(),
              query_text: q.queryText || null,
              execution_count: q.executionCount || 0,
              total_cpu_time_ms: q.totalCpuTime || 0,
              avg_cpu_time_ms: q.avgCpuTime || 0,
              total_duration_ms: q.totalDuration || 0,
              avg_duration_ms: q.avgDuration || 0,
              total_logical_reads: q.totalLogicalReads || 0,
              avg_logical_reads: q.avgLogicalReads || 0,
              total_logical_writes: q.totalLogicalWrites || 0,
              avg_logical_writes: q.avgLogicalWrites || 0,
              last_execution_time: q.lastExecutionTime || null,
              plan_count: q.planCount || null,
              synced_at: new Date().toISOString(),
            }));

            if (insights.length > 0) {
              const { error: upsertError } = await supabaseClient
                .from("azure_sql_insights")
                .upsert(insights, { onConflict: "azure_resource_id,query_hash" });

              if (!upsertError) {
                totalInsights += insights.length;
              }
            }

            const perfMetrics = await fetchSqlPerformanceMetrics(token, resource.azure_resource_id);
            if (perfMetrics) {
              const perfStats = parsePerformanceMetrics(perfMetrics);
              perfStats.azure_resource_id = resource.id;

              const { error: perfError } = await supabaseClient
                .from("azure_sql_performance_stats")
                .insert(perfStats);

              if (!perfError) {
                totalPerfStats++;
              }
            }

            const recommendations = await fetchSqlRecommendations(
              token,
              tenant.subscription_id,
              resource.azure_resource_id
            );

            // deno-lint-ignore no-explicit-any
            const recInserts = recommendations.map((rec: any) => ({
              azure_resource_id: resource.id,
              recommendation_id: rec.id || crypto.randomUUID(),
              name: rec.properties?.shortDescription?.problem || rec.name || 'Recommendation',
              category: rec.properties?.category || null,
              impact: rec.properties?.impact || null,
              impacted_field: rec.properties?.impactedField || null,
              impacted_value: rec.properties?.impactedValue || null,
              problem: rec.properties?.shortDescription?.problem || null,
              solution: rec.properties?.shortDescription?.solution || null,
              is_resolved: false,
              last_seen_at: new Date().toISOString(),
            }));

            if (recInserts.length > 0) {
              const { error: recError } = await supabaseClient
                .from("azure_sql_recommendations")
                .upsert(recInserts, { onConflict: "azure_resource_id,recommendation_id" });

              if (!recError) {
                totalRecommendations += recInserts.length;
              }
            }

          } catch (err) {
            console.error(`Error syncing SQL data for ${resource.azure_resource_id}:`, err);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Synced SQL data for ${sqlResources?.length || 0} databases`,
            insights_count: totalInsights,
            performance_stats_count: totalPerfStats,
            recommendations_count: totalRecommendations,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "sync-performance": {
        if (!tenantId) {
          throw new Error("tenantId required for sync-performance action");
        }

        const syncStartTime = Date.now();
        console.log(`[azure-sql-insights] Starting performance sync for tenant ${tenantId}`);

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

        let resourceQuery = supabaseClient
          .from("azure_resources")
          .select("id, azure_resource_id, name")
          .eq("azure_tenant_id", tenantId)
          .eq("resource_type", "Microsoft.Sql/servers/databases");

        if (resourceId) {
          resourceQuery = resourceQuery.eq("id", resourceId);
        }

        const { data: sqlResources, error: resourcesError } = await resourceQuery;

        if (resourcesError) {
          throw new Error(`Failed to fetch SQL resources: ${resourcesError.message}`);
        }

        let totalPerfStats = 0;
        let timedOut = false;

        const { results: perfResults, processedCount, timedOut: didTimeout } = await processBatched(
          sqlResources || [],
          async (resource) => {
            try {
              const perfMetrics = await fetchSqlPerformanceMetrics(token, resource.azure_resource_id);
              if (!perfMetrics) return 0;

              const perfStats = parsePerformanceMetrics(perfMetrics);
              perfStats.azure_resource_id = resource.id;

              const { error: perfError } = await supabaseClient
                .from("azure_sql_performance_stats")
                .insert(perfStats);

              return perfError ? 0 : 1;
            } catch (err) {
              console.error(`Error syncing performance for ${resource.name}:`, err);
              return 0;
            }
          },
          BATCH_SIZE,
          syncStartTime
        );

        totalPerfStats = perfResults.reduce((sum: number, r: number) => sum + r, 0);
        timedOut = didTimeout;

        return new Response(
          JSON.stringify({
            success: true,
            message: `Synced performance stats for ${processedCount} databases`,
            syncedCount: totalPerfStats,
            processedDatabases: processedCount,
            totalDatabases: sqlResources?.length || 0,
            timedOut,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "sync-wait-stats": {
        if (!tenantId) {
          throw new Error("tenantId required for sync-wait-stats action");
        }

        const waitStartTime = Date.now();
        console.log(`[azure-sql-insights] Starting wait stats sync for tenant ${tenantId}`);

        const { data: tenant, error: tenantError } = await supabaseClient
          .from("azure_tenants")
          .select("*")
          .eq("id", tenantId)
          .single();

        if (tenantError || !tenant) {
          throw new Error(`Tenant not found: ${tenantError?.message}`);
        }

        const { data: workspaces, error: workspaceError } = await supabaseClient
          .from("log_analytics_workspaces")
          .select("*")
          .eq("azure_tenant_id", tenantId);

        if (workspaceError) {
          throw new Error(`Failed to fetch workspaces: ${workspaceError.message}`);
        }

        if (!workspaces || workspaces.length === 0) {
          return new Response(
            JSON.stringify({ success: true, message: "No Log Analytics workspaces configured", syncedCount: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const clientSecret = await getClientSecretFromVault(supabaseClient, tenant.client_secret_id);
        const logAnalyticsToken = await getLogAnalyticsToken(tenant.tenant_id, tenant.client_id, clientSecret);

        const sqlResources = await fetchAllSqlResources(supabaseClient, tenantId, "id, name");

        // deno-lint-ignore no-explicit-any
        const waitResourcePairs: { workspace: any; resource: any }[] = [];
        for (const workspace of workspaces) {
          for (const resource of sqlResources || []) {
            waitResourcePairs.push({ workspace, resource });
          }
        }

        const { results: waitResults, processedCount, timedOut } = await processBatched(
          waitResourcePairs,
          async ({ workspace, resource }) => {
            try {
              const waitStats = await fetchWaitStatsFromLogAnalytics(
                logAnalyticsToken,
                workspace.workspace_id,
                resource.name
              );

              if (waitStats.length === 0) return 0;

              await supabaseClient
                .from("azure_sql_wait_stats")
                .delete()
                .eq("azure_resource_id", resource.id);

              const inserts = waitStats.map((stat) => ({
                azure_resource_id: resource.id,
                wait_type: stat.wait_type,
                wait_time_ms: stat.wait_time_ms,
                wait_count: stat.wait_count,
                avg_wait_time_ms: stat.avg_wait_time_ms,
                max_wait_time_ms: stat.max_wait_time_ms,
                collected_at: new Date().toISOString(),
                synced_at: new Date().toISOString(),
              }));

              const { error: insertError } = await supabaseClient
                .from("azure_sql_wait_stats")
                .insert(inserts);

              return insertError ? 0 : inserts.length;
            } catch (err) {
              console.error(`Error fetching wait stats for ${resource.name}:`, err);
              return 0;
            }
          },
          BATCH_SIZE,
          waitStartTime
        );

        const totalWaitStats = waitResults.reduce((sum: number, r: number) => sum + r, 0);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Synced wait stats for ${sqlResources?.length || 0} databases`,
            syncedCount: totalWaitStats,
            processedPairs: processedCount,
            totalPairs: waitResourcePairs.length,
            timedOut,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "wait-stats": {
        if (!resourceId) {
          throw new Error("resourceId required for wait-stats action");
        }

        const { data, error } = await supabaseClient
          .from("azure_sql_wait_stats")
          .select("*")
          .eq("azure_resource_id", resourceId)
          .order("wait_time_ms", { ascending: false })
          .limit(20);

        if (error) {
          throw new Error(`Failed to fetch wait stats: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, waitStats: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "historical-sync": {
        // Historical sync using chaining pattern to avoid timeouts
        if (!tenantId) {
          throw new Error("tenantId required for historical-sync action");
        }

        const days = body.days || 7;
        if (days > 31) {
          throw new Error("Maximum historical period is 31 days (Log Analytics default retention)");
        }

        console.log(`[azure-sql-insights] Starting historical sync for tenant ${tenantId}, ${days} days`);

        const { data: tenant, error: tenantError } = await supabaseClient
          .from("azure_tenants")
          .select("*")
          .eq("id", tenantId)
          .single();

        if (tenantError || !tenant) {
          throw new Error(`Tenant not found: ${tenantError?.message}`);
        }

        const { data: workspaces, error: workspaceError } = await supabaseClient
          .from("log_analytics_workspaces")
          .select("*")
          .eq("azure_tenant_id", tenantId);

        if (workspaceError) {
          throw new Error(`Failed to fetch workspaces: ${workspaceError.message}`);
        }

        if (!workspaces || workspaces.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "No Log Analytics workspaces configured for this tenant.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const sqlResources = await fetchAllSqlResources(supabaseClient, tenantId, "id, name, azure_resource_id");

        if (!sqlResources || sqlResources.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "No SQL databases found for this tenant." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const totalChunks = workspaces.length * sqlResources.length;
        
        // Initialize chunk details for each workspace-resource pair
        const chunkDetails: ChunkDetail[] = [];
        let chunkIndex = 0;
        for (const workspace of workspaces) {
          for (const resource of sqlResources) {
            chunkDetails.push({
              chunk_index: chunkIndex++,
              label: `${resource.name} (${workspace.workspace_name})`,
              status: 'pending',
              records: 0,
              started_at: null,
              completed_at: null,
              error: null,
            });
          }
        }

        const { data: progress, error: progressError } = await supabaseClient
          .from("azure_sync_progress")
          .insert({
            tenant_id: tenantId,
            sync_type: "sql-insights",
            status: "running",
            start_date: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            total_chunks: totalChunks,
            completed_chunks: 0,
            records_synced: 0,
            chunk_details: JSON.stringify(chunkDetails),
          })
          .select()
          .single();

        if (progressError) {
          throw new Error(`Failed to create sync progress: ${progressError.message}`);
        }

        const lookbackHours = days * 24;

        // Trigger the first chunk via chaining (non-blocking)
        triggerNextSqlInsightsChunk(
          tenantId,
          progress.id,
          tenant.client_secret_id,
          tenant.subscription_id,
          workspaces,
          sqlResources,
          lookbackHours,
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
            message: `Historical SQL insights sync started for ${days} days`,
            progressId: progress.id,
            totalDatabases: sqlResources.length,
            totalWorkspaces: workspaces.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "top-queries": {
        if (!resourceId) {
          throw new Error("resourceId required for top-queries action");
        }

        const { data, error } = await supabaseClient
          .from("azure_sql_insights")
          .select("*")
          .eq("azure_resource_id", resourceId)
          .order("avg_cpu_time_ms", { ascending: false })
          .limit(20);

        if (error) {
          throw new Error(`Failed to fetch top queries: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, queries: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "long-running": {
        if (!resourceId) {
          throw new Error("resourceId required for long-running action");
        }

        const { data, error } = await supabaseClient
          .from("azure_sql_insights")
          .select("*")
          .eq("azure_resource_id", resourceId)
          .order("avg_duration_ms", { ascending: false })
          .limit(20);

        if (error) {
          throw new Error(`Failed to fetch long-running queries: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, queries: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "performance-stats": {
        if (!resourceId) {
          throw new Error("resourceId required for performance-stats action");
        }

        const { data, error } = await supabaseClient
          .from("azure_sql_performance_stats")
          .select("*")
          .eq("azure_resource_id", resourceId)
          .order("timestamp_utc", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw new Error(`Failed to fetch performance stats: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, stats: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "sync-replication": {
        if (!tenantId) {
          throw new Error("tenantId required for sync-replication action");
        }

        const replStartTime = Date.now();

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

        let replResourceQuery = supabaseClient
          .from("azure_resources")
          .select("id, azure_resource_id, name")
          .eq("azure_tenant_id", tenantId)
          .eq("resource_type", "Microsoft.Sql/servers/databases");

        if (resourceId) {
          replResourceQuery = replResourceQuery.eq("id", resourceId);
        }

        const { data: sqlResources, error: resourcesError } = await replResourceQuery;

        if (resourcesError) {
          throw new Error(`Failed to fetch SQL resources: ${resourcesError.message}`);
        }

        const { results: replResults, processedCount, timedOut } = await processBatched(
          sqlResources || [],
          async (resource) => {
            try {
              const replicationLinks = await fetchReplicationLinks(token, resource.azure_resource_id);

              if (replicationLinks.length === 0) return 0;

              // deno-lint-ignore no-explicit-any
              const linkInserts = replicationLinks.map((link: any) => ({
                azure_resource_id: resource.id,
                link_id: link.id || link.name || crypto.randomUUID(),
                partner_server: link.properties?.partnerServer || 'unknown',
                partner_database: link.properties?.partnerDatabase || 'unknown',
                partner_location: link.properties?.partnerLocation || null,
                role: link.properties?.role || null,
                replication_mode: link.properties?.replicationMode || 'ASYNC',
                replication_state: link.properties?.replicationState || null,
                percent_complete: link.properties?.percentComplete || null,
                replication_lag_seconds: link.properties?.replicationLagSeconds || null,
                last_replicated_time: link.properties?.lastReplicatedTime || null,
                is_termination_allowed: link.properties?.isTerminationAllowed ?? null,
                synced_at: new Date().toISOString(),
              }));

              const { error: upsertError } = await supabaseClient
                .from("azure_sql_replication_links")
                .upsert(linkInserts, { onConflict: "azure_resource_id,link_id" });

              return upsertError ? 0 : linkInserts.length;
            } catch (err) {
              console.error(`Error syncing replication for ${resource.name}:`, err);
              return 0;
            }
          },
          BATCH_SIZE,
          replStartTime
        );

        const totalLinks = replResults.reduce((sum: number, r: number) => sum + r, 0);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Synced replication links for ${processedCount} databases`,
            syncedCount: totalLinks,
            processedDatabases: processedCount,
            totalDatabases: sqlResources?.length || 0,
            timedOut,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "replication-status": {
        if (!resourceId) {
          throw new Error("resourceId required for replication-status action");
        }

        const { data, error } = await supabaseClient
          .from("azure_sql_replication_links")
          .select("*")
          .eq("azure_resource_id", resourceId)
          .order("synced_at", { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch replication links: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, links: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Azure SQL insights error:", error);
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
