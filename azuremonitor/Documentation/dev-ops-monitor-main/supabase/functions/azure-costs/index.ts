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

// Generate monthly chunks for historical sync (Azure Cost API has monthly limits)
function generateMonthlyChunks(startDate: string, endDate: string): { start: string; end: string }[] {
  const chunks: { start: string; end: string }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let current = new Date(start);
  
  while (current < end) {
    const chunkStart = new Date(current);
    // Move to end of month or end date, whichever is earlier
    const chunkEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0); // Last day of month
    
    chunks.push({
      start: chunkStart.toISOString().split('T')[0],
      end: chunkEnd > end ? end.toISOString().split('T')[0] : chunkEnd.toISOString().split('T')[0],
    });
    
    // Move to first day of next month
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  
  return chunks;
}

// Fetch cost data from Azure Cost Management API with pagination support
async function fetchCostData(
  token: string,
  subscriptionId: string,
  startDate: string,
  endDate: string
// deno-lint-ignore no-explicit-any
): Promise<any[]> {
  // deno-lint-ignore no-explicit-any
  let allRows: any[] = [];
  let url: string | null = `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2023-03-01`;

  const requestBody = {
    type: "ActualCost",
    timeframe: "Custom",
    timePeriod: {
      from: startDate,
      to: endDate,
    },
    dataset: {
      granularity: "Daily",
      aggregation: {
        totalCost: { name: "Cost", function: "Sum" },
      },
      grouping: [
        { type: "Dimension", name: "ResourceId" },
        { type: "Dimension", name: "ResourceGroup" },
        { type: "Dimension", name: "MeterCategory" },
        { type: "Dimension", name: "MeterSubcategory" },
        { type: "Dimension", name: "Meter" },
      ],
    },
  };

  let columns: { name: string }[] = [];
  let pageCount = 0;

  while (url) {
    pageCount++;
    console.log(`Fetching cost data page ${pageCount}...`);

    // Azure Cost Management API requires POST with body for ALL requests, including pagination
    const response: Response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cost API error:", errorText);
      throw new Error(`Failed to fetch cost data: ${response.status}`);
    }

    // deno-lint-ignore no-explicit-any
    const data: any = await response.json();

    // Get columns from first response only
    if (pageCount === 1) {
      columns = data.properties?.columns || [];
    }

    // Add rows to collection
    const rows = data.properties?.rows || [];
    allRows = allRows.concat(rows);
    console.log(`Page ${pageCount}: fetched ${rows.length} rows (total: ${allRows.length})`);

    // Check for next page - Azure includes nextLink for pagination
    url = data.properties?.nextLink || null;

    // Add delay between pages to avoid rate limiting (500ms)
    if (url) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`Fetched ${allRows.length} total rows across ${pageCount} pages`);

  // Map rows to objects using column names
  // deno-lint-ignore no-explicit-any
  return allRows.map((row: any[]) => {
    // deno-lint-ignore no-explicit-any
    const item: any = {};
    columns.forEach((col: { name: string }, idx: number) => {
      item[col.name] = row[idx];
    });
    return item;
  });
}

// Fetch cost data with retry logic for rate limiting (429 errors)
async function fetchCostDataWithRetry(
  token: string,
  subscriptionId: string,
  startDate: string,
  endDate: string,
  maxRetries: number = 3
// deno-lint-ignore no-explicit-any
): Promise<any[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchCostData(token, subscriptionId, startDate, endDate);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if it's a rate limit error (429)
      if (lastError.message?.includes('429')) {
        const waitTime = attempt * 15000; // 15s, 30s, 45s
        console.log(`Rate limited (429). Waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // Non-retryable error, throw immediately
        throw lastError;
      }
    }
  }
  
  throw lastError;
}

// Parse Azure date format (handles numeric 20260112 or ISO strings)
function parseAzureDate(dateValue: unknown): string | null {
  if (!dateValue) return null;
  
  // Handle numeric format like 20260112
  if (typeof dateValue === 'number') {
    const str = dateValue.toString();
    if (str.length === 8) {
      const year = str.substring(0, 4);
      const month = str.substring(4, 6);
      const day = str.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
  }
  
  // Handle string format (ISO date or numeric string)
  if (typeof dateValue === 'string') {
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
      return dateValue.split('T')[0];
    }
    // If numeric string like "20260112"
    if (/^\d{8}$/.test(dateValue)) {
      return `${dateValue.substring(0,4)}-${dateValue.substring(4,6)}-${dateValue.substring(6,8)}`;
    }
    // Try parsing as date
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1980) {
      return parsed.toISOString().split('T')[0];
    }
  }
  
  return null;
}

// Upsert cost data to database
async function upsertCostData(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  tenantId: string,
  // deno-lint-ignore no-explicit-any
  costData: any[]
): Promise<number> {
  if (costData.length === 0) return 0;

  // First, map the data to the database format
  // deno-lint-ignore no-explicit-any
  const mappedData = costData.map((item: any) => ({
    azure_tenant_id: tenantId,
    azure_resource_id: item.ResourceId || null,
    resource_group: item.ResourceGroup || null,
    meter_category: item.MeterCategory || null,
    meter_subcategory: item.MeterSubcategory || null,
    meter_name: item.Meter || null,
    cost_amount: item.Cost || 0,
    currency: "USD",
    usage_date: parseAzureDate(item.UsageDate),
  })).filter(item => item.usage_date); // Filter out items without valid date

  if (mappedData.length === 0) return 0;

  // Deduplicate by aggregating costs for same key combination
  // This prevents "ON CONFLICT DO UPDATE command cannot affect row a second time" error
  const dedupeMap = new Map<string, typeof mappedData[0]>();
  
  for (const item of mappedData) {
    // Create composite key from unique constraint fields
    const key = [
      item.azure_tenant_id,
      item.azure_resource_id || 'null',
      item.usage_date,
      item.meter_category || 'null',
      item.meter_subcategory || 'null',
      item.meter_name || 'null',
    ].join('|');

    const existing = dedupeMap.get(key);
    if (existing) {
      // Sum up the costs for duplicate entries
      existing.cost_amount = Number(existing.cost_amount) + Number(item.cost_amount);
    } else {
      dedupeMap.set(key, { ...item });
    }
  }

  const upsertData = Array.from(dedupeMap.values());
  
  console.log(`Deduped ${mappedData.length} rows to ${upsertData.length} unique entries`);

  const { error: upsertError } = await supabaseClient
    .from("azure_cost_data")
    .upsert(upsertData, { 
      onConflict: 'azure_tenant_id,azure_resource_id,usage_date,meter_category,meter_subcategory,meter_name',
      ignoreDuplicates: false 
    });

  if (upsertError) {
    console.error("Upsert error:", upsertError);
    throw new Error(`Failed to upsert cost data: ${upsertError.message}`);
  }

  return upsertData.length;
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

// Process a single chunk and chain to next chunk
async function processSingleChunk(
  // deno-lint-ignore no-explicit-any
  supabaseClient: any,
  progressId: string,
  tenantId: string,
  subscriptionId: string,
  clientSecretId: string,
  chunks: { start: string; end: string }[],
  chunkIndex: number,
  totalRecordsSoFar: number,
  completedChunksSoFar: number,
  failedChunksSoFar: number,
  startTime: number,
  chunkDetails: ChunkDetail[]
) {
  const chunk = chunks[chunkIndex];
  const chunkLabel = `${chunk.start} to ${chunk.end}`;
  
  console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length}: ${chunkLabel}`);
  
  try {
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
      current_operation: 'Fetching cost data',
      current_resource_name: chunkLabel,
      chunk_details: JSON.stringify(chunkDetails),
    });
    
    // Fetch and upsert data with retry
    const costData = await fetchCostDataWithRetry(token, subscriptionId, chunk.start, chunk.end);
    const recordCount = await upsertCostData(supabaseClient, tenantId, costData);
    
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
    const remainingChunks = chunks.length - (newCompletedChunks + failedChunksSoFar);
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
    
    console.log(`Chunk ${chunkIndex + 1} completed: ${recordCount} records synced`);
    
    // Check if there are more chunks to process
    if (chunkIndex < chunks.length - 1) {
      console.log('Triggering next chunk via new function invocation...');
      
      // Trigger next chunk via edge function invoke (separate invocation to avoid CPU limits)
      const nextChunkPayload = {
        action: 'sync-chunk',
        tenantId,
        progressId,
        subscriptionId,
        clientSecretId,
        chunks,
        chunkIndex: chunkIndex + 1,
        totalRecords: newTotalRecords,
        completedChunks: newCompletedChunks,
        failedChunks: failedChunksSoFar,
        startTime,
        chunkDetails,
      };
      
      // Use waitUntil to trigger next chunk after response
      EdgeRuntime.waitUntil(
        (async () => {
          // Wait 3 seconds before starting next chunk to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          
          await fetch(`${supabaseUrl}/functions/v1/azure-costs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(nextChunkPayload),
          });
        })()
      );
    } else {
      // All chunks done
      await updateSyncProgress(supabaseClient, progressId, {
        status: failedChunksSoFar > 0 ? "completed" : "completed",
        completed_chunks: newCompletedChunks,
        records_synced: newTotalRecords,
        failed_chunks: failedChunksSoFar,
        current_operation: null,
        current_resource_name: null,
        completed_at: new Date().toISOString(),
        chunk_details: JSON.stringify(chunkDetails),
      });
      
      console.log(`Historical sync completed: ${newTotalRecords} total records, ${failedChunksSoFar} failed chunks`);
    }
    
    return { success: true, records: recordCount };
    
  } catch (error) {
    console.error(`Error processing chunk ${chunkLabel}:`, error);
    
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
    if (chunkIndex < chunks.length - 1) {
      console.log('Triggering next chunk despite failure...');
      
      const nextChunkPayload = {
        action: 'sync-chunk',
        tenantId,
        progressId,
        subscriptionId,
        clientSecretId,
        chunks,
        chunkIndex: chunkIndex + 1,
        totalRecords: totalRecordsSoFar,
        completedChunks: completedChunksSoFar,
        failedChunks: newFailedChunks,
        startTime,
        chunkDetails,
      };
      
      EdgeRuntime.waitUntil(
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          
          await fetch(`${supabaseUrl}/functions/v1/azure-costs`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify(nextChunkPayload),
          });
        })()
      );
    } else {
      // All chunks processed (some may have failed)
      await updateSyncProgress(supabaseClient, progressId, {
        status: newFailedChunks === chunks.length ? "failed" : "completed",
        current_operation: null,
        current_resource_name: null,
        completed_at: new Date().toISOString(),
        chunk_details: JSON.stringify(chunkDetails),
      });
      
      console.log(`Historical sync completed with failures: ${totalRecordsSoFar} records, ${newFailedChunks} failed chunks`);
    }
    
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
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
    const { action, tenantId, startDate, endDate, resourceGroup } = body;

    // Handle sync-chunk action separately (doesn't need tenant lookup in the same way)
    if (action === 'sync-chunk') {
      const { 
        progressId, 
        subscriptionId, 
        clientSecretId, 
        chunks, 
        chunkIndex, 
        totalRecords, 
        completedChunks, 
        failedChunks, 
        startTime, 
        chunkDetails 
      } = body;
      
      console.log(`Sync-chunk invoked for chunk ${chunkIndex + 1}/${chunks.length}`);
      
      const result = await processSingleChunk(
        supabaseClient,
        progressId,
        tenantId,
        subscriptionId,
        clientSecretId,
        chunks,
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

    // Handle cost-comparison action separately (uses tenantId but doesn't need full tenant object)
    if (action === 'cost-comparison') {
      const { 
        period1Start, period1End, 
        period2Start, period2End, 
        excludeResourceGroups = [], 
        meterCategories = [] 
      } = body;

      console.log(`Cost comparison: P1=${period1Start} to ${period1End}, P2=${period2Start} to ${period2End}, tenant=${tenantId || 'all'}`);

      // Fetch all data with pagination to bypass 1000 row limit
      async function fetchAllCostData(
        start: string, 
        end: string, 
        tenant: string | undefined, 
        categories: string[]
      ) {
        const PAGE_SIZE = 1000;
        // deno-lint-ignore no-explicit-any
        let allData: any[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          let query = supabaseClient
            .from("azure_cost_data")
            .select("usage_date, cost_amount, resource_group, meter_category, azure_resource_id")
            .gte("usage_date", start)
            .lte("usage_date", end)
            .order("usage_date", { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

          if (tenant) {
            query = query.eq("azure_tenant_id", tenant);
          }

          if (categories && categories.length > 0) {
            query = query.in("meter_category", categories);
          }

          const { data, error } = await query;
          if (error) throw new Error(`Fetch error: ${error.message}`);

          allData = allData.concat(data || []);
          hasMore = (data?.length || 0) === PAGE_SIZE;
          offset += PAGE_SIZE;
        }

        console.log(`Fetched ${allData.length} rows for ${start} to ${end}`);
        return allData;
      }

      // Aggregate period data
      // deno-lint-ignore no-explicit-any
      function aggregatePeriod(data: any[], startDate: string, endDate: string, excludeRGs: string[]) {
        // deno-lint-ignore no-explicit-any
        const included = data.filter((d: any) => 
          !d.resource_group || !excludeRGs.includes(d.resource_group)
        );
        // deno-lint-ignore no-explicit-any
        const excluded = data.filter((d: any) => 
          d.resource_group && excludeRGs.includes(d.resource_group)
        );

        const costByDate: Record<string, number> = {};
        const byResourceGroupMap: Record<string, number> = {};
        const byCategoryMap: Record<string, number> = {};
        const byResourceMap: Record<string, number> = {};
        let totalCost = 0;

        // deno-lint-ignore no-explicit-any
        included.forEach((item: any) => {
          const date = item.usage_date;
          const cost = Number(item.cost_amount) || 0;

          costByDate[date] = (costByDate[date] || 0) + cost;
          totalCost += cost;

          const rg = item.resource_group || 'Unknown';
          byResourceGroupMap[rg] = (byResourceGroupMap[rg] || 0) + cost;

          const cat = item.meter_category || 'Unknown';
          byCategoryMap[cat] = (byCategoryMap[cat] || 0) + cost;

          const res = item.azure_resource_id || 'Unknown';
          byResourceMap[res] = (byResourceMap[res] || 0) + cost;
        });

        // Calculate normalized days
        const startMs = new Date(startDate).getTime();
        const dailyCosts = Object.entries(costByDate)
          .map(([date, cost]) => ({
            date,
            cost,
            normalizedDay: Math.floor((new Date(date).getTime() - startMs) / (1000 * 60 * 60 * 24)) + 1,
          }))
          .sort((a, b) => a.normalizedDay - b.normalizedDay);

        const daysInPeriod = Math.max(
          1,
          Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
        );

        // deno-lint-ignore no-explicit-any
        const excludedCost = excluded.reduce((sum: number, d: any) => sum + (Number(d.cost_amount) || 0), 0);

        return {
          totalCost,
          dailyCosts,
          dailyAverage: totalCost / daysInPeriod,
          daysInPeriod,
          byResourceGroupMap,
          byCategoryMap,
          byResourceMap,
          excludedCost,
        };
      }

      // Combine breakdowns from two periods
      function combineBreakdowns(
        map1: Record<string, number>,
        map2: Record<string, number>,
        existingIds?: Set<string>
      ) {
        const allKeys = new Set([...Object.keys(map1), ...Object.keys(map2)]);
        return Array.from(allKeys)
          .map(name => {
            const period1Cost = map1[name] || 0;
            const period2Cost = map2[name] || 0;
            const variance = period1Cost - period2Cost;
            const percentChange = period2Cost === 0 
              ? (period1Cost > 0 ? 100 : 0) 
              : ((period1Cost - period2Cost) / period2Cost) * 100;
            const isNew = period1Cost > 0 && period2Cost === 0;
            const isRemoved = period1Cost === 0 && period2Cost > 0;
            const hasSavings = !isNew && !isRemoved && variance < 0;
            const savingsAmount = hasSavings ? Math.abs(variance) : (isRemoved ? period2Cost : 0);
            const deletedFromAzure = existingIds !== undefined && name !== 'Unknown' 
              ? !existingIds.has(name) 
              : undefined;
            return { name, period1Cost, period2Cost, variance, percentChange, isNew, isRemoved, hasSavings, savingsAmount, deletedFromAzure };
          })
          .sort((a, b) => b.period1Cost - a.period1Cost);
      }

      // Fetch existing resource IDs
      async function getExistingResourceIds(tenant?: string): Promise<Set<string>> {
        let query = supabaseClient
          .from('azure_resources')
          .select('azure_resource_id');
        
        if (tenant) {
          query = query.eq('azure_tenant_id', tenant);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // deno-lint-ignore no-explicit-any
        return new Set((data || []).map((r: any) => r.azure_resource_id));
      }

      // Execute in parallel
      const [period1Data, period2Data, existingResourceIds] = await Promise.all([
        fetchAllCostData(period1Start, period1End, tenantId, meterCategories),
        fetchAllCostData(period2Start, period2End, tenantId, meterCategories),
        getExistingResourceIds(tenantId),
      ]);

      const p1Processed = aggregatePeriod(period1Data, period1Start, period1End, excludeResourceGroups);
      const p2Processed = aggregatePeriod(period2Data, period2Start, period2End, excludeResourceGroups);

      const byResourceGroup = combineBreakdowns(p1Processed.byResourceGroupMap, p2Processed.byResourceGroupMap);
      const byCategory = combineBreakdowns(p1Processed.byCategoryMap, p2Processed.byCategoryMap);
      const byResource = combineBreakdowns(p1Processed.byResourceMap, p2Processed.byResourceMap, existingResourceIds).slice(0, 20);

      const absoluteDiff = p1Processed.totalCost - p2Processed.totalCost;
      const percentChange = p2Processed.totalCost === 0
        ? (p1Processed.totalCost > 0 ? 100 : 0)
        : ((p1Processed.totalCost - p2Processed.totalCost) / p2Processed.totalCost) * 100;

      const result = {
        period1: {
          totalCost: p1Processed.totalCost,
          dailyCosts: p1Processed.dailyCosts,
          dailyAverage: p1Processed.dailyAverage,
          daysInPeriod: p1Processed.daysInPeriod,
          byResourceGroup,
          byCategory,
          byResource,
        },
        period2: {
          totalCost: p2Processed.totalCost,
          dailyCosts: p2Processed.dailyCosts,
          dailyAverage: p2Processed.dailyAverage,
          daysInPeriod: p2Processed.daysInPeriod,
          byResourceGroup,
          byCategory,
          byResource,
        },
        variance: {
          absoluteDiff,
          percentChange,
        },
        excludedCost: {
          period1: p1Processed.excludedCost,
          period2: p2Processed.excludedCost,
        },
      };

      console.log(`Cost comparison result: P1=$${p1Processed.totalCost.toFixed(2)}, P2=$${p2Processed.totalCost.toFixed(2)}`);

      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant details for other actions
    const { data: tenant, error: tenantError } = await supabaseClient
      .from("azure_tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Tenant not found: ${tenantError?.message}`);
    }

    switch (action) {
      case "sync": {
        // Sync cost data from Azure (regular sync - last 30 days)
        const clientSecret = await getClientSecretFromVault(supabaseClient, tenant.client_secret_id);
        const token = await getAzureToken(tenant.tenant_id, tenant.client_id, clientSecret);

        // Default to last 30 days if not specified
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        console.log(`Fetching cost data from ${start} to ${end}`);
        const costData = await fetchCostData(token, tenant.subscription_id, start, end);
        const recordCount = await upsertCostData(supabaseClient, tenantId, costData);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Synced ${recordCount} cost records`,
            count: recordCount,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "historical-sync": {
        // Historical sync with progress tracking - using chunk chaining
        const clientSecret = await getClientSecretFromVault(supabaseClient, tenant.client_secret_id);
        
        // Validate date range (max 13 months back)
        const maxHistorical = new Date();
        maxHistorical.setMonth(maxHistorical.getMonth() - 13);
        
        const requestedStart = new Date(startDate);
        if (requestedStart < maxHistorical) {
          throw new Error("Start date cannot be more than 13 months in the past");
        }

        const end = endDate || new Date().toISOString().split('T')[0];
        const chunks = generateMonthlyChunks(startDate, end);

        console.log(`Historical sync: ${chunks.length} monthly chunks from ${startDate} to ${end}`);

        // Initialize chunk details
        const chunkDetails: ChunkDetail[] = chunks.map((chunk, idx) => ({
          chunk_index: idx,
          label: `${chunk.start} to ${chunk.end}`,
          status: 'pending' as const,
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
            sync_type: "costs",
            status: "running",
            start_date: startDate,
            end_date: end,
            total_chunks: chunks.length,
            completed_chunks: 0,
            records_synced: 0,
            failed_chunks: 0,
            chunk_details: JSON.stringify(chunkDetails),
          })
          .select()
          .single();

        if (progressError) {
          throw new Error(`Failed to create sync progress: ${progressError.message}`);
        }

        const startTime = Date.now();

        // Start first chunk processing (subsequent chunks will chain automatically)
        EdgeRuntime.waitUntil(
          processSingleChunk(
            supabaseClient,
            progress.id,
            tenantId,
            tenant.subscription_id,
            tenant.client_secret_id,
            chunks,
            0, // Start with first chunk
            0, // No records yet
            0, // No completed chunks yet
            0, // No failed chunks yet
            startTime,
            chunkDetails
          )
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: `Historical sync started (${chunks.length} chunks will process sequentially)`,
            progressId: progress.id,
            totalChunks: chunks.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "summary": {
        // Fetch all cost data using pagination to overcome Supabase 1000 row limit
        const BATCH_SIZE = 1000;
        let allData: { cost_amount: number; meter_category: string | null }[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          let query = supabaseClient
            .from("azure_cost_data")
            .select("cost_amount, meter_category")
            .eq("azure_tenant_id", tenantId)
            .order("usage_date", { ascending: true })
            .range(offset, offset + BATCH_SIZE - 1);

          if (startDate) {
            query = query.gte("usage_date", startDate);
          }
          if (endDate) {
            query = query.lte("usage_date", endDate);
          }

          const { data, error } = await query;

          if (error) {
            throw new Error(`Failed to fetch cost summary: ${error.message}`);
          }

          if (data && data.length > 0) {
            allData = allData.concat(data);
            offset += data.length;
            hasMore = data.length === BATCH_SIZE;
          } else {
            hasMore = false;
          }
        }

        console.log(`Fetched ${allData.length} cost records for tenant ${tenantId}`);

        // Calculate totals
        const totalCost = allData.reduce((sum, item) => sum + Number(item.cost_amount), 0);
        
        // Group by category
        const byCategory: Record<string, number> = {};
        allData.forEach((item) => {
          const cat = item.meter_category || "Unknown";
          byCategory[cat] = (byCategory[cat] || 0) + Number(item.cost_amount);
        });

        return new Response(
          JSON.stringify({
            success: true,
            total_cost: totalCost,
            currency: "USD",
            by_category: byCategory,
            record_count: allData.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "trend": {
        // Get daily cost trend
        let query = supabaseClient
          .from("azure_cost_data")
          .select("cost_amount, usage_date")
          .eq("azure_tenant_id", tenantId)
          .order("usage_date");

        if (startDate) {
          query = query.gte("usage_date", startDate);
        }
        if (endDate) {
          query = query.lte("usage_date", endDate);
        }
        if (resourceGroup) {
          query = query.eq("resource_group", resourceGroup);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(`Failed to fetch cost trend: ${error.message}`);
        }

        // Aggregate by date
        const dailyCosts: Record<string, number> = {};
        data?.forEach((item) => {
          const date = item.usage_date;
          dailyCosts[date] = (dailyCosts[date] || 0) + Number(item.cost_amount);
        });

        const trend = Object.entries(dailyCosts).map(([date, cost]) => ({
          date,
          cost,
        }));

        return new Response(
          JSON.stringify({ success: true, trend }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "by-resource": {
        // Get costs grouped by resource
        const { data, error } = await supabaseClient
          .from("azure_cost_data")
          .select("azure_resource_id, resource_group, cost_amount")
          .eq("azure_tenant_id", tenantId)
          .not("azure_resource_id", "is", null);

        if (error) {
          throw new Error(`Failed to fetch resource costs: ${error.message}`);
        }

        // Group by resource
        const byResource: Record<string, { cost: number; resource_group: string }> = {};
        data?.forEach((item) => {
          const key = item.azure_resource_id;
          if (!byResource[key]) {
            byResource[key] = { cost: 0, resource_group: item.resource_group || "" };
          }
          byResource[key].cost += Number(item.cost_amount);
        });

        const resources = Object.entries(byResource)
          .map(([id, data]) => ({
            resource_id: id,
            resource_group: data.resource_group,
            total_cost: data.cost,
          }))
          .sort((a, b) => b.total_cost - a.total_cost)
          .slice(0, 50);

        return new Response(
          JSON.stringify({ success: true, resources }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Azure costs error:", error);
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
