import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CostAlertRule {
  id: string;
  name: string;
  azure_tenant_id: string;
  resource_group: string | null;
  azure_resource_id: string | null;
  threshold_amount: number;
  threshold_period: "daily" | "weekly" | "monthly";
  comparison_operator: "gt" | "gte" | "lt" | "lte";
  is_enabled: boolean;
  // Quiet hours fields
  quiet_hours_enabled: boolean | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_days: string[] | null;
  quiet_hours_timezone: string | null;
}

// Check if current time falls within quiet hours for a rule
function isInQuietHours(rule: CostAlertRule): { suppressed: boolean; reason: string | null } {
  if (!rule.quiet_hours_enabled || !rule.quiet_hours_start || !rule.quiet_hours_end) {
    return { suppressed: false, reason: null };
  }
  
  const now = new Date();
  const timezone = rule.quiet_hours_timezone || 'UTC';
  
  try {
    // Convert current time to the rule's timezone
    const localTime = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'long'
    }).formatToParts(now);
    
    const currentHour = parseInt(localTime.find(p => p.type === 'hour')?.value || '0');
    const currentMinute = parseInt(localTime.find(p => p.type === 'minute')?.value || '0');
    const currentDay = localTime.find(p => p.type === 'weekday')?.value?.toLowerCase();
    
    // Check if today is in the quiet days (if specified)
    if (rule.quiet_hours_days && rule.quiet_hours_days.length > 0) {
      if (!rule.quiet_hours_days.includes(currentDay || '')) {
        return { suppressed: false, reason: null };
      }
    }
    
    // Parse start/end times (format: "HH:MM:SS" or "HH:MM")
    const [startHour, startMinute] = rule.quiet_hours_start.split(':').map(Number);
    const [endHour, endMinute] = rule.quiet_hours_end.split(':').map(Number);
    
    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    // Handle overnight ranges (e.g., 22:00 - 08:00)
    let inQuietHours = false;
    if (startMinutes <= endMinutes) {
      // Same day range (e.g., 09:00 - 17:00)
      inQuietHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight range (e.g., 22:00 - 08:00)
      inQuietHours = currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    
    if (inQuietHours) {
      const startFormatted = rule.quiet_hours_start.substring(0, 5);
      const endFormatted = rule.quiet_hours_end.substring(0, 5);
      return {
        suppressed: true,
        reason: `Quiet hours active (${startFormatted}-${endFormatted} ${timezone})`
      };
    }
  } catch (error) {
    console.error('Error checking quiet hours:', error);
  }
  
  return { suppressed: false, reason: null };
}

// Calculate date range based on period
function getDateRange(period: "daily" | "weekly" | "monthly"): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  
  let startDate: string;
  switch (period) {
    case "daily":
      startDate = endDate;
      break;
    case "weekly":
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split("T")[0];
      break;
    case "monthly":
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = monthStart.toISOString().split("T")[0];
      break;
  }
  
  return { startDate, endDate };
}

// Compare values based on operator
function compareValues(current: number, threshold: number, operator: string): boolean {
  switch (operator) {
    case "gt":
      return current > threshold;
    case "gte":
      return current >= threshold;
    case "lt":
      return current < threshold;
    case "lte":
      return current <= threshold;
    default:
      return current > threshold;
  }
}

// Determine severity based on how much threshold is exceeded
function determineSeverity(current: number, threshold: number): "warning" | "critical" {
  const percentage = (current / threshold) * 100;
  if (percentage >= 150) return "critical";
  return "warning";
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
    const { action, tenantId } = body;

    switch (action) {
      case "evaluate": {
        // Evaluate all enabled cost alert rules
        console.log("Evaluating cost alert rules...");
        
        // Get all enabled rules
        let rulesQuery = supabaseClient
          .from("azure_cost_alert_rules")
          .select("*")
          .eq("is_enabled", true);
        
        // Filter by tenant if specified
        if (tenantId) {
          rulesQuery = rulesQuery.eq("azure_tenant_id", tenantId);
        }

        const { data: rules, error: rulesError } = await rulesQuery;

        if (rulesError) {
          throw new Error(`Failed to fetch rules: ${rulesError.message}`);
        }

        console.log(`Found ${rules?.length || 0} enabled rules to evaluate`);

        const triggeredAlerts: Array<{
          rule_id: string;
          azure_tenant_id: string;
          current_cost: number;
          threshold_amount: number;
          severity: string;
          message: string;
          notification_suppressed: boolean;
          suppression_reason: string | null;
        }> = [];

        for (const rule of (rules || []) as CostAlertRule[]) {
          try {
            const { startDate, endDate } = getDateRange(rule.threshold_period);
            
            // Build cost query
            let costQuery = supabaseClient
              .from("azure_cost_data")
              .select("cost_amount")
              .eq("azure_tenant_id", rule.azure_tenant_id)
              .gte("usage_date", startDate)
              .lte("usage_date", endDate);

            // Apply scope filters
            if (rule.resource_group) {
              costQuery = costQuery.eq("resource_group", rule.resource_group);
            }
            
            if (rule.azure_resource_id) {
              // Get the azure_resource_id from the azure_resources table
              const { data: resource } = await supabaseClient
                .from("azure_resources")
                .select("azure_resource_id")
                .eq("id", rule.azure_resource_id)
                .single();
              
              if (resource) {
                costQuery = costQuery.eq("azure_resource_id", resource.azure_resource_id);
              }
            }

            const { data: costData, error: costError } = await costQuery;

            if (costError) {
              console.error(`Error fetching costs for rule ${rule.id}:`, costError);
              continue;
            }

            // Sum up costs
            const totalCost = (costData || []).reduce(
              (sum, item) => sum + (parseFloat(item.cost_amount) || 0),
              0
            );

            console.log(`Rule "${rule.name}": Current cost $${totalCost.toFixed(2)}, Threshold $${rule.threshold_amount}`);

            // Check if threshold is exceeded
            if (compareValues(totalCost, rule.threshold_amount, rule.comparison_operator)) {
              // Check if we already have an unresolved alert for this rule
              const { data: existingAlert } = await supabaseClient
                .from("azure_cost_alerts")
                .select("id")
                .eq("rule_id", rule.id)
                .is("resolved_at", null)
                .single();

              if (!existingAlert) {
                const severity = determineSeverity(totalCost, rule.threshold_amount);
                const operatorText = {
                  gt: "exceeded",
                  gte: "reached",
                  lt: "dropped below",
                  lte: "at or below",
                }[rule.comparison_operator];

                // Check quiet hours for this rule
                const quietHoursStatus = isInQuietHours(rule);
                
                if (quietHoursStatus.suppressed) {
                  console.log(`Rule "${rule.name}" triggered but notification suppressed: ${quietHoursStatus.reason}`);
                }

                triggeredAlerts.push({
                  rule_id: rule.id,
                  azure_tenant_id: rule.azure_tenant_id,
                  current_cost: totalCost,
                  threshold_amount: rule.threshold_amount,
                  severity,
                  message: `${rule.threshold_period.charAt(0).toUpperCase() + rule.threshold_period.slice(1)} cost has ${operatorText} threshold: $${totalCost.toFixed(2)} (threshold: $${rule.threshold_amount})`,
                  notification_suppressed: quietHoursStatus.suppressed,
                  suppression_reason: quietHoursStatus.reason,
                });
              }
            }
          } catch (err) {
            console.error(`Error evaluating rule ${rule.id}:`, err);
          }
        }

        // Insert triggered alerts
        if (triggeredAlerts.length > 0) {
          const { error: insertError } = await supabaseClient
            .from("azure_cost_alerts")
            .insert(triggeredAlerts);

          if (insertError) {
            console.error("Error inserting alerts:", insertError);
          } else {
            console.log(`Created ${triggeredAlerts.length} new cost alerts`);
            
            // TODO: Send notifications for non-suppressed alerts
            const alertsToNotify = triggeredAlerts.filter(a => !a.notification_suppressed);
            console.log(`${alertsToNotify.length} alerts will send notifications`);
            console.log(`${triggeredAlerts.length - alertsToNotify.length} alerts have notifications suppressed due to quiet hours`);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            rules_evaluated: rules?.length || 0,
            alerts_triggered: triggeredAlerts.length,
            notifications_suppressed: triggeredAlerts.filter(a => a.notification_suppressed).length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check-single": {
        // Check a single rule immediately (for testing)
        const { ruleId } = body;
        
        if (!ruleId) {
          throw new Error("ruleId is required");
        }

        const { data: rule, error: ruleError } = await supabaseClient
          .from("azure_cost_alert_rules")
          .select("*")
          .eq("id", ruleId)
          .single();

        if (ruleError || !rule) {
          throw new Error(`Rule not found: ${ruleError?.message}`);
        }

        const typedRule = rule as CostAlertRule;
        const { startDate, endDate } = getDateRange(typedRule.threshold_period);

        let costQuery = supabaseClient
          .from("azure_cost_data")
          .select("cost_amount")
          .eq("azure_tenant_id", typedRule.azure_tenant_id)
          .gte("usage_date", startDate)
          .lte("usage_date", endDate);

        if (typedRule.resource_group) {
          costQuery = costQuery.eq("resource_group", typedRule.resource_group);
        }

        const { data: costData } = await costQuery;

        const totalCost = (costData || []).reduce(
          (sum, item) => sum + (parseFloat(item.cost_amount) || 0),
          0
        );

        const isTriggered = compareValues(totalCost, typedRule.threshold_amount, typedRule.comparison_operator);
        const quietHoursStatus = isInQuietHours(typedRule);

        return new Response(
          JSON.stringify({
            success: true,
            rule: typedRule.name,
            current_cost: totalCost,
            threshold: typedRule.threshold_amount,
            period: typedRule.threshold_period,
            date_range: { startDate, endDate },
            would_trigger: isTriggered,
            quiet_hours: {
              enabled: typedRule.quiet_hours_enabled,
              currently_in_quiet_hours: quietHoursStatus.suppressed,
              reason: quietHoursStatus.reason,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error("Azure cost alerts error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
