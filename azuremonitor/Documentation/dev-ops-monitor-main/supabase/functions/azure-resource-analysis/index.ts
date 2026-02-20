import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CostDataPoint {
  azure_resource_id: string | null;
  usage_date: string;
  cost_amount: number;
  azure_tenant_id: string;
}

interface MetricDataPoint {
  azure_resource_id: string;
  metric_name: string;
  average: number | null;
  maximum: number | null;
  timestamp_utc: string;
}

// Statistical anomaly detection using rolling average + standard deviation
function detectCostAnomalies(
  costData: CostDataPoint[],
  tenantId: string,
  windowDays: number = 14,
  deviationThreshold: number = 2
): Array<{
  azure_tenant_id: string;
  azure_resource_id: string | null;
  resource_group: string | null;
  anomaly_date: string;
  expected_cost: number;
  actual_cost: number;
  deviation_percent: number;
  anomaly_type: 'spike' | 'drop';
  severity: 'info' | 'warning' | 'critical';
}> {
  const anomalies: Array<{
    azure_tenant_id: string;
    azure_resource_id: string | null;
    resource_group: string | null;
    anomaly_date: string;
    expected_cost: number;
    actual_cost: number;
    deviation_percent: number;
    anomaly_type: 'spike' | 'drop';
    severity: 'info' | 'warning' | 'critical';
  }> = [];

  // Group by resource
  const byResource = new Map<string, CostDataPoint[]>();
  costData.forEach(d => {
    const key = d.azure_resource_id || 'TOTAL';
    if (!byResource.has(key)) byResource.set(key, []);
    byResource.get(key)!.push(d);
  });

  // Also analyze total daily costs
  const dailyTotals = new Map<string, number>();
  costData.forEach(d => {
    const existing = dailyTotals.get(d.usage_date) || 0;
    dailyTotals.set(d.usage_date, existing + d.cost_amount);
  });
  
  const sortedDates = Array.from(dailyTotals.keys()).sort();
  
  // Detect anomalies on daily totals
  for (let i = windowDays; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];
    const currentCost = dailyTotals.get(currentDate)!;
    
    // Get window of previous days
    const windowCosts: number[] = [];
    for (let j = i - windowDays; j < i; j++) {
      windowCosts.push(dailyTotals.get(sortedDates[j]) || 0);
    }
    
    const mean = windowCosts.reduce((a, b) => a + b, 0) / windowCosts.length;
    const variance = windowCosts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / windowCosts.length;
    const stdDev = Math.sqrt(variance);
    
    // Skip if no meaningful variation
    if (stdDev < 1 || mean < 10) continue;
    
    const zScore = (currentCost - mean) / stdDev;
    const deviationPercent = ((currentCost - mean) / mean) * 100;
    
    if (Math.abs(zScore) >= deviationThreshold) {
      const isSpike = zScore > 0;
      let severity: 'info' | 'warning' | 'critical' = 'info';
      
      if (Math.abs(deviationPercent) > 100) severity = 'critical';
      else if (Math.abs(deviationPercent) > 50) severity = 'warning';
      
      anomalies.push({
        azure_tenant_id: tenantId,
        azure_resource_id: null,
        resource_group: null,
        anomaly_date: currentDate,
        expected_cost: Math.round(mean * 100) / 100,
        actual_cost: Math.round(currentCost * 100) / 100,
        deviation_percent: Math.round(deviationPercent * 100) / 100,
        anomaly_type: isSpike ? 'spike' : 'drop',
        severity,
      });
    }
  }

  return anomalies;
}

// Calculate optimization score for a resource
function calculateOptimizationScore(
  resourceId: string,
  resourceType: string,
  metrics: MetricDataPoint[],
  monthlyCost: number,
  hasRecommendations: boolean
): { score: number; breakdown: Record<string, number>; grade: string } {
  let utilizationScore = 100;
  let costEfficiencyScore = 100;
  let bestPracticesScore = 100;
  
  // Filter metrics for this resource
  const resourceMetrics = metrics.filter(m => m.azure_resource_id === resourceId);
  
  // === Utilization Score (40% weight) ===
  // Penalize for very low or very high utilization
  const cpuMetrics = resourceMetrics.filter(m => 
    m.metric_name.toLowerCase().includes('cpu') || 
    m.metric_name.toLowerCase().includes('dtu')
  );
  
  if (cpuMetrics.length > 0) {
    const avgCpu = cpuMetrics.reduce((sum, m) => sum + (m.average || 0), 0) / cpuMetrics.length;
    const maxCpu = Math.max(...cpuMetrics.map(m => m.maximum || m.average || 0));
    
    // Optimal utilization is 40-70%
    if (avgCpu < 10) {
      utilizationScore -= 40; // Severely underutilized
    } else if (avgCpu < 20) {
      utilizationScore -= 25; // Underutilized
    } else if (avgCpu < 40) {
      utilizationScore -= 10; // Slightly underutilized
    } else if (avgCpu > 85) {
      utilizationScore -= 20; // Overloaded
    } else if (avgCpu > 75) {
      utilizationScore -= 10; // High
    }
    
    // Bonus for consistent utilization (low variance)
    if (maxCpu > 0 && avgCpu > 0) {
      const variance = (maxCpu - avgCpu) / avgCpu;
      if (variance < 0.3) utilizationScore = Math.min(100, utilizationScore + 5);
    }
  }
  
  // === Cost Efficiency Score (30% weight) ===
  // Based on cost per utilization unit
  if (cpuMetrics.length > 0 && monthlyCost > 0) {
    const avgCpu = cpuMetrics.reduce((sum, m) => sum + (m.average || 0), 0) / cpuMetrics.length;
    const costPerUtilization = monthlyCost / Math.max(avgCpu, 1);
    
    // Lower cost per utilization is better
    // These thresholds vary by resource type
    if (avgCpu < 15 && monthlyCost > 100) {
      costEfficiencyScore -= 40; // High cost, low usage
    } else if (avgCpu < 25 && monthlyCost > 200) {
      costEfficiencyScore -= 30;
    } else if (avgCpu < 20 && monthlyCost > 50) {
      costEfficiencyScore -= 20;
    }
  }
  
  // === Best Practices Score (30% weight) ===
  if (hasRecommendations) {
    bestPracticesScore -= 25; // Has unresolved recommendations
  }
  
  // Weight the scores
  const finalScore = Math.round(
    utilizationScore * 0.4 + 
    costEfficiencyScore * 0.3 + 
    bestPracticesScore * 0.3
  );
  
  // Calculate grade
  let grade = 'F';
  if (finalScore >= 90) grade = 'A';
  else if (finalScore >= 80) grade = 'B';
  else if (finalScore >= 70) grade = 'C';
  else if (finalScore >= 60) grade = 'D';
  
  return {
    score: Math.max(0, Math.min(100, finalScore)),
    breakdown: {
      utilization: Math.max(0, utilizationScore),
      costEfficiency: Math.max(0, costEfficiencyScore),
      bestPractices: Math.max(0, bestPracticesScore),
    },
    grade,
  };
}

// Detect idle resources
function detectIdleResources(
  resources: Array<{ id: string; name: string; resource_type: string; azure_tenant_id: string }>,
  metrics: MetricDataPoint[],
  costs: Map<string, number>,
  lookbackDays: number = 7,
  minCost: number = 10
): Array<{
  azure_resource_id: string;
  azure_tenant_id: string;
  idle_days: number;
  monthly_cost: number;
  idle_reason: string;
  metrics_summary: Record<string, number>;
}> {
  const idleResources: Array<{
    azure_resource_id: string;
    azure_tenant_id: string;
    idle_days: number;
    monthly_cost: number;
    idle_reason: string;
    metrics_summary: Record<string, number>;
  }> = [];

  const now = new Date();
  const lookbackDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  for (const resource of resources) {
    const monthlyCost = costs.get(resource.id) || 0;
    
    // Skip if cost is too low to matter
    if (monthlyCost < minCost) continue;
    
    // Get metrics for this resource in lookback period
    const resourceMetrics = metrics.filter(m => 
      m.azure_resource_id === resource.id &&
      new Date(m.timestamp_utc) >= lookbackDate
    );
    
    if (resourceMetrics.length === 0) {
      // No metrics at all = likely idle
      idleResources.push({
        azure_resource_id: resource.id,
        azure_tenant_id: resource.azure_tenant_id,
        idle_days: lookbackDays,
        monthly_cost: monthlyCost,
        idle_reason: 'No metrics data available',
        metrics_summary: {},
      });
      continue;
    }
    
    // Calculate average utilization
    const cpuMetrics = resourceMetrics.filter(m => 
      m.metric_name.toLowerCase().includes('cpu') || 
      m.metric_name.toLowerCase().includes('dtu')
    );
    
    const networkMetrics = resourceMetrics.filter(m =>
      m.metric_name.toLowerCase().includes('network') ||
      m.metric_name.toLowerCase().includes('ingress') ||
      m.metric_name.toLowerCase().includes('egress') ||
      m.metric_name.toLowerCase().includes('bytes')
    );
    
    const requestMetrics = resourceMetrics.filter(m =>
      m.metric_name.toLowerCase().includes('request') ||
      m.metric_name.toLowerCase().includes('connection')
    );
    
    const avgCpu = cpuMetrics.length > 0
      ? cpuMetrics.reduce((sum, m) => sum + (m.average || 0), 0) / cpuMetrics.length
      : null;
    
    const maxCpu = cpuMetrics.length > 0
      ? Math.max(...cpuMetrics.map(m => m.maximum || m.average || 0))
      : null;
    
    const avgNetwork = networkMetrics.length > 0
      ? networkMetrics.reduce((sum, m) => sum + (m.average || 0), 0) / networkMetrics.length
      : null;
    
    const totalRequests = requestMetrics.length > 0
      ? requestMetrics.reduce((sum, m) => sum + (m.average || 0), 0)
      : null;
    
    // Determine if idle
    const reasons: string[] = [];
    
    if (avgCpu !== null && avgCpu < 2 && maxCpu !== null && maxCpu < 5) {
      reasons.push(`Near-zero CPU (avg ${avgCpu.toFixed(1)}%, max ${maxCpu.toFixed(1)}%)`);
    }
    
    if (avgNetwork !== null && avgNetwork < 1000) { // Less than 1KB
      reasons.push('Minimal network activity');
    }
    
    if (totalRequests !== null && totalRequests < 10) {
      reasons.push(`Very few requests (${totalRequests.toFixed(0)} total)`);
    }
    
    if (reasons.length >= 2 || (avgCpu !== null && avgCpu < 1 && maxCpu !== null && maxCpu < 2)) {
      idleResources.push({
        azure_resource_id: resource.id,
        azure_tenant_id: resource.azure_tenant_id,
        idle_days: lookbackDays,
        monthly_cost: monthlyCost,
        idle_reason: reasons.join('; ') || 'Very low activity across all metrics',
        metrics_summary: {
          avgCpu: avgCpu || 0,
          maxCpu: maxCpu || 0,
          avgNetwork: avgNetwork || 0,
          totalRequests: totalRequests || 0,
        },
      });
    }
  }

  return idleResources.sort((a, b) => b.monthly_cost - a.monthly_cost);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { action, tenantId, skipHistorical = true, historicalCutoffDays = 3 } = await req.json();

    console.log(`Azure resource analysis: action=${action}, tenantId=${tenantId}, skipHistorical=${skipHistorical}, cutoffDays=${historicalCutoffDays}`);

    switch (action) {
      case "detect-anomalies": {
        // Get cost data for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        let query = supabaseClient
          .from("azure_cost_data")
          .select("azure_resource_id, usage_date, cost_amount, azure_tenant_id")
          .gte("usage_date", thirtyDaysAgo.toISOString().split('T')[0])
          .order("usage_date", { ascending: true });
        
        if (tenantId) {
          query = query.eq("azure_tenant_id", tenantId);
        }
        
        const { data: costData, error: costError } = await query;
        if (costError) throw costError;

        // Get unique tenants to process
        const tenants = new Set<string>();
        costData?.forEach(d => tenants.add(d.azure_tenant_id));

        const allAnomalies: any[] = [];
        
        // Calculate cutoff date for historical filtering
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - historicalCutoffDays);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
        
        for (const tid of tenants) {
          const tenantCosts = costData?.filter(d => d.azure_tenant_id === tid) || [];
          const anomalies = detectCostAnomalies(tenantCosts, tid);
          
          // Filter to only recent anomalies if skipHistorical is true
          if (skipHistorical) {
            const recentAnomalies = anomalies.filter(a => a.anomaly_date >= cutoffDateStr);
            console.log(`Tenant ${tid}: Found ${anomalies.length} total anomalies, keeping ${recentAnomalies.length} within ${historicalCutoffDays}-day cutoff`);
            allAnomalies.push(...recentAnomalies);
          } else {
            allAnomalies.push(...anomalies);
          }
        }

        // Upsert anomalies
        if (allAnomalies.length > 0) {
          const { error: upsertError } = await supabaseClient
            .from("azure_cost_anomalies")
            .upsert(allAnomalies, { 
              onConflict: "azure_tenant_id,azure_resource_id,anomaly_date",
              ignoreDuplicates: false 
            });
          
          if (upsertError) {
            console.error("Error upserting anomalies:", upsertError);
          }
        }

        console.log(`Detected ${allAnomalies.length} cost anomalies (skipHistorical=${skipHistorical})`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            anomaliesDetected: allAnomalies.length,
            skipHistorical,
            historicalCutoffDays,
            anomalies: allAnomalies.slice(0, 10) // Return first 10 for preview
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "calculate-scores": {
        // Get all resources
        let resourceQuery = supabaseClient
          .from("azure_resources")
          .select("id, name, resource_type, azure_tenant_id");
        
        if (tenantId) {
          resourceQuery = resourceQuery.eq("azure_tenant_id", tenantId);
        }
        
        const { data: resources, error: resourcesError } = await resourceQuery;
        if (resourcesError) throw resourcesError;

        if (!resources || resources.length === 0) {
          return new Response(
            JSON.stringify({ success: true, scoresUpdated: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get metrics from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: metrics } = await supabaseClient
          .from("azure_metrics")
          .select("azure_resource_id, metric_name, average, maximum, timestamp_utc")
          .in("azure_resource_id", resources.map(r => r.id))
          .gte("timestamp_utc", sevenDaysAgo.toISOString());

        // Get current month costs
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: costData } = await supabaseClient
          .from("azure_cost_data")
          .select("azure_resource_id, cost_amount")
          .gte("usage_date", `${currentMonth}-01`);

        // Aggregate costs by resource
        const costsByResource = new Map<string, number>();
        costData?.forEach(c => {
          if (c.azure_resource_id) {
            const existing = costsByResource.get(c.azure_resource_id) || 0;
            // Note: azure_resource_id in cost_data is the Azure resource ID string, not UUID
            // We need to match by looking up the resource
          }
        });

        // Get resources with recommendations
        const { data: recommendations } = await supabaseClient
          .from("azure_sql_recommendations")
          .select("azure_resource_id")
          .eq("is_resolved", false);

        const resourcesWithRecs = new Set(recommendations?.map(r => r.azure_resource_id) || []);

        // Calculate scores and update
        let updated = 0;
        for (const resource of resources) {
          const hasRecs = resourcesWithRecs.has(resource.id);
          const monthlyCost = costsByResource.get(resource.id) || 0;
          
          const scoreResult = calculateOptimizationScore(
            resource.id,
            resource.resource_type,
            metrics || [],
            monthlyCost,
            hasRecs
          );

          const { error: updateError } = await supabaseClient
            .from("azure_resources")
            .update({
              optimization_score: scoreResult.score,
              score_breakdown: scoreResult.breakdown,
              score_updated_at: new Date().toISOString(),
            })
            .eq("id", resource.id);

          if (!updateError) updated++;
        }

        console.log(`Updated optimization scores for ${updated} resources`);

        return new Response(
          JSON.stringify({ success: true, scoresUpdated: updated }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "detect-idle": {
        // Get all resources
        let resourceQuery = supabaseClient
          .from("azure_resources")
          .select("id, name, resource_type, azure_tenant_id");
        
        if (tenantId) {
          resourceQuery = resourceQuery.eq("azure_tenant_id", tenantId);
        }
        
        const { data: resources, error: resourcesError } = await resourceQuery;
        if (resourcesError) throw resourcesError;

        if (!resources || resources.length === 0) {
          return new Response(
            JSON.stringify({ success: true, idleDetected: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get metrics from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: metrics } = await supabaseClient
          .from("azure_metrics")
          .select("azure_resource_id, metric_name, average, maximum, timestamp_utc")
          .in("azure_resource_id", resources.map(r => r.id))
          .gte("timestamp_utc", sevenDaysAgo.toISOString());

        // Get current month costs by Azure resource ID
        const currentMonth = new Date().toISOString().slice(0, 7);
        const { data: costData } = await supabaseClient
          .from("azure_cost_data")
          .select("azure_resource_id, cost_amount")
          .gte("usage_date", `${currentMonth}-01`);

        // Map azure_resource_id (string) to our resource IDs
        // First get the mapping
        const resourceIdMap = new Map<string, string>();
        const { data: resourceMappings } = await supabaseClient
          .from("azure_resources")
          .select("id, azure_resource_id");
        
        resourceMappings?.forEach(r => {
          resourceIdMap.set(r.azure_resource_id.toLowerCase(), r.id);
        });

        // Aggregate costs
        const costsByResource = new Map<string, number>();
        costData?.forEach(c => {
          if (c.azure_resource_id) {
            const internalId = resourceIdMap.get(c.azure_resource_id.toLowerCase());
            if (internalId) {
              const existing = costsByResource.get(internalId) || 0;
              costsByResource.set(internalId, existing + c.cost_amount);
            }
          }
        });

        // Detect idle resources
        const idleResources = detectIdleResources(
          resources,
          metrics || [],
          costsByResource
        );

        // Upsert idle resources
        const today = new Date().toISOString().split('T')[0];
        if (idleResources.length > 0) {
          const records = idleResources.map(r => ({
            ...r,
            detection_date: today,
            status: 'detected',
          }));

          const { error: upsertError } = await supabaseClient
            .from("azure_idle_resources")
            .upsert(records, {
              onConflict: "azure_resource_id,detection_date",
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error("Error upserting idle resources:", upsertError);
          }
        }

        console.log(`Detected ${idleResources.length} idle resources`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            idleDetected: idleResources.length,
            idleResources: idleResources.slice(0, 10)
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "run-all": {
        // Run all analyses
        const results = {
          anomalies: 0,
          scores: 0,
          idle: 0,
        };

        // 1. Detect anomalies
        const anomalyResponse = await fetch(req.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "detect-anomalies", tenantId }),
        });
        const anomalyResult = await anomalyResponse.json();
        results.anomalies = anomalyResult.anomaliesDetected || 0;

        // 2. Calculate scores
        const scoresResponse = await fetch(req.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "calculate-scores", tenantId }),
        });
        const scoresResult = await scoresResponse.json();
        results.scores = scoresResult.scoresUpdated || 0;

        // 3. Detect idle
        const idleResponse = await fetch(req.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "detect-idle", tenantId }),
        });
        const idleResult = await idleResponse.json();
        results.idle = idleResult.idleDetected || 0;

        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Azure resource analysis error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
