import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonitoringCheck {
  id: string;
  resource_id: string;
  check_type: 'http' | 'ping' | 'ssl' | 'port' | 'keyword' | 'heartbeat' | 'azure_metric' | 'azure_health';
  url: string | null;
  ip_address: string | null;
  port: number | null;
  expected_status_code: number | null;
  timeout_seconds: number;
  is_enabled: boolean;
  // Existing fields
  keyword_value: string | null;
  keyword_type: 'contains' | 'not_contains' | null;
  http_method: string | null;
  http_auth_type: 'none' | 'basic' | 'bearer' | null;
  http_auth_credentials: { username?: string; password?: string; token?: string } | null;
  custom_headers: Record<string, string> | null;
  failure_threshold: number;
  current_failure_count: number;
  heartbeat_interval_seconds: number | null;
  last_heartbeat_at: string | null;
  // Retry configuration
  retry_count: number | null;
  retry_delay_ms: number | null;
  confirmation_delay_ms: number | null;
  // Azure metric configuration
  azure_metric_name: string | null;
  azure_metric_namespace: string | null;
  timeframe_minutes: number | null;
  aggregation_type: 'average' | 'max' | 'min' | 'total' | null;
  metric_threshold_value: number | null;
  metric_comparison_operator: 'gt' | 'gte' | 'lt' | 'lte' | null;
}

interface CheckResult {
  monitoring_check_id: string;
  status: 'success' | 'failure' | 'warning';
  response_time_ms: number | null;
  status_code: number | null;
  ssl_expiry_date: string | null;
  ssl_days_remaining: number | null;
  error_message: string | null;
}

interface AlertRule {
  id: string;
  resource_id: string | null;
  resource_type: string | null;
  is_template: boolean;
  rule_type: string;
  comparison_operator: string;
  threshold_value: number;
  is_enabled: boolean;
  // Quiet hours fields
  quiet_hours_enabled: boolean | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_days: string[] | null;
  quiet_hours_timezone: string | null;
}

// Check if current time falls within quiet hours for a rule
function isInQuietHours(rule: AlertRule): { suppressed: boolean; reason: string | null } {
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

// Build request headers based on auth config
function buildRequestHeaders(check: MonitoringCheck): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'MonitoringBot/1.0',
  };

  // Add custom headers
  if (check.custom_headers) {
    Object.assign(headers, check.custom_headers);
  }

  // Add auth headers
  if (check.http_auth_type === 'basic' && check.http_auth_credentials) {
    const { username, password } = check.http_auth_credentials;
    if (username && password) {
      const encoded = btoa(`${username}:${password}`);
      headers['Authorization'] = `Basic ${encoded}`;
    }
  } else if (check.http_auth_type === 'bearer' && check.http_auth_credentials) {
    const { token } = check.http_auth_credentials;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

// Execute HTTP check
async function executeHttpCheck(check: MonitoringCheck): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), check.timeout_seconds * 1000);
    
    const method = check.http_method || 'GET';
    const headers = buildRequestHeaders(check);
    
    const response = await fetch(check.url!, {
      method,
      signal: controller.signal,
      headers,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const expectedStatus = check.expected_status_code || 200;
    const isSuccess = response.status === expectedStatus;
    
    return {
      monitoring_check_id: check.id,
      status: isSuccess ? 'success' : 'failure',
      response_time_ms: responseTime,
      status_code: response.status,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: isSuccess ? null : `Expected status ${expectedStatus}, got ${response.status}`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: responseTime,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Execute Keyword check
async function executeKeywordCheck(check: MonitoringCheck): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), check.timeout_seconds * 1000);
    
    const method = check.http_method || 'GET';
    const headers = buildRequestHeaders(check);
    
    const response = await fetch(check.url!, {
      method,
      signal: controller.signal,
      headers,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const body = await response.text();
    const keyword = check.keyword_value || '';
    const keywordType = check.keyword_type || 'contains';
    
    const containsKeyword = body.includes(keyword);
    const isSuccess = keywordType === 'contains' ? containsKeyword : !containsKeyword;
    
    return {
      monitoring_check_id: check.id,
      status: isSuccess ? 'success' : 'failure',
      response_time_ms: responseTime,
      status_code: response.status,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: isSuccess ? null : 
        keywordType === 'contains' 
          ? `Keyword "${keyword}" not found in response`
          : `Keyword "${keyword}" was found in response (should not contain)`,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: responseTime,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Execute SSL check - verifies SSL connection and checks certificate validity via TLS handshake
async function executeSslCheck(check: MonitoringCheck): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const url = new URL(check.url!);
    const hostname = url.hostname;
    
    // Attempt HTTPS request to verify SSL is working
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), check.timeout_seconds * 1000);
    
    const response = await fetch(check.url!, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // If we got here, SSL handshake succeeded
    return {
      monitoring_check_id: check.id,
      status: 'success',
      response_time_ms: responseTime,
      status_code: response.status,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: null,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'SSL check failed';
    
    const isSSLError = errorMessage.includes('certificate') || 
                       errorMessage.includes('SSL') || 
                       errorMessage.includes('TLS');
    
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: responseTime,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: isSSLError ? `SSL Error: ${errorMessage}` : errorMessage,
    };
  }
}

// Execute Port check
async function executePortCheck(check: MonitoringCheck): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), check.timeout_seconds * 1000);
    
    const conn = await Deno.connect({
      hostname: check.ip_address!,
      port: check.port!,
    });
    
    clearTimeout(timeoutId);
    conn.close();
    
    const responseTime = Date.now() - startTime;
    
    return {
      monitoring_check_id: check.id,
      status: 'success',
      response_time_ms: responseTime,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: null,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: responseTime,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: error instanceof Error ? error.message : 'Port check failed',
    };
  }
}

// Execute Ping check (using TCP connection as ICMP is not available in Deno)
async function executePingCheck(check: MonitoringCheck): Promise<CheckResult> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), check.timeout_seconds * 1000);
    
    const port = check.port || 80;
    const conn = await Deno.connect({
      hostname: check.ip_address!,
      port,
    });
    
    clearTimeout(timeoutId);
    conn.close();
    
    const responseTime = Date.now() - startTime;
    
    return {
      monitoring_check_id: check.id,
      status: 'success',
      response_time_ms: responseTime,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: null,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: responseTime,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: error instanceof Error ? error.message : 'Ping check failed',
    };
  }
}

// Execute Heartbeat check - checks if heartbeat was received within expected interval
async function executeHeartbeatCheck(check: MonitoringCheck): Promise<CheckResult> {
  const now = Date.now();
  
  if (!check.last_heartbeat_at) {
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: null,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: 'No heartbeat received yet',
    };
  }
  
  const lastHeartbeat = new Date(check.last_heartbeat_at).getTime();
  const expectedInterval = (check.heartbeat_interval_seconds || 300) * 1000; // Default 5 min
  const gracePeriod = expectedInterval * 1.5; // 50% grace period
  
  const timeSinceLastHeartbeat = now - lastHeartbeat;
  
  if (timeSinceLastHeartbeat <= expectedInterval) {
    return {
      monitoring_check_id: check.id,
      status: 'success',
      response_time_ms: timeSinceLastHeartbeat,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: null,
    };
  } else if (timeSinceLastHeartbeat <= gracePeriod) {
    return {
      monitoring_check_id: check.id,
      status: 'warning',
      response_time_ms: timeSinceLastHeartbeat,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: `Heartbeat delayed - last received ${Math.round(timeSinceLastHeartbeat / 1000)}s ago`,
    };
  } else {
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: timeSinceLastHeartbeat,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: `Heartbeat missed - last received ${Math.round(timeSinceLastHeartbeat / 1000)}s ago (expected every ${check.heartbeat_interval_seconds}s)`,
    };
  }
}

// Default retry configuration (used if not specified per-check)
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,           // Number of retries before marking as failed
  retryDelayMs: 2000,      // Delay between retries (2 seconds)
  confirmationDelayMs: 5000, // Delay before confirmation check (5 seconds)
};

// Get retry config for a specific check (uses per-check settings or defaults)
function getRetryConfig(check: MonitoringCheck) {
  return {
    maxRetries: check.retry_count ?? DEFAULT_RETRY_CONFIG.maxRetries,
    retryDelayMs: check.retry_delay_ms ?? DEFAULT_RETRY_CONFIG.retryDelayMs,
    confirmationDelayMs: check.confirmation_delay_ms ?? DEFAULT_RETRY_CONFIG.confirmationDelayMs,
  };
}

// Sleep utility function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute a single check attempt based on type
async function executeSingleCheck(check: MonitoringCheck, supabaseClient?: any): Promise<CheckResult> {
  switch (check.check_type) {
    case 'http':
      return executeHttpCheck(check);
    case 'keyword':
      return executeKeywordCheck(check);
    case 'ssl':
      return executeSslCheck(check);
    case 'port':
      return executePortCheck(check);
    case 'ping':
      return executePingCheck(check);
    case 'heartbeat':
      return executeHeartbeatCheck(check);
    case 'azure_metric':
      return executeAzureMetricCheck(check, supabaseClient);
    case 'azure_health':
      return executeAzureHealthCheck(check, supabaseClient);
    default:
      return {
        monitoring_check_id: check.id,
        status: 'failure',
        response_time_ms: null,
        status_code: null,
        ssl_expiry_date: null,
        ssl_days_remaining: null,
        error_message: `Unknown check type: ${check.check_type}`,
      };
  }
}

// Execute Azure Metric check - queries azure_metrics table
async function executeAzureMetricCheck(check: MonitoringCheck, supabaseClient: any): Promise<CheckResult> {
  if (!supabaseClient) {
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: null,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: 'Supabase client not available for Azure metric check',
    };
  }

  try {
    // Get resource's azure_resource_id
    const { data: resource, error: resourceError } = await supabaseClient
      .from('resources')
      .select('azure_resource_id')
      .eq('id', check.resource_id)
      .single();

    if (resourceError || !resource?.azure_resource_id) {
      return {
        monitoring_check_id: check.id,
        status: 'failure',
        response_time_ms: null,
        status_code: null,
        ssl_expiry_date: null,
        ssl_days_remaining: null,
        error_message: 'No Azure resource linked to this resource',
      };
    }

    const timeframeMs = (check.timeframe_minutes || 5) * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeframeMs).toISOString();

    // Query azure_metrics for recent data
    const { data: metrics, error: metricsError } = await supabaseClient
      .from('azure_metrics')
      .select('average, minimum, maximum, total')
      .eq('azure_resource_id', resource.azure_resource_id)
      .eq('metric_name', check.azure_metric_name)
      .gte('timestamp_utc', cutoffTime)
      .order('timestamp_utc', { ascending: false });

    if (metricsError) {
      console.error('Error fetching Azure metrics:', metricsError);
      return {
        monitoring_check_id: check.id,
        status: 'failure',
        response_time_ms: null,
        status_code: null,
        ssl_expiry_date: null,
        ssl_days_remaining: null,
        error_message: `Error fetching metrics: ${metricsError.message}`,
      };
    }

    if (!metrics || metrics.length === 0) {
      return {
        monitoring_check_id: check.id,
        status: 'failure',
        response_time_ms: null,
        status_code: null,
        ssl_expiry_date: null,
        ssl_days_remaining: null,
        error_message: `No metric data available for ${check.azure_metric_name}`,
      };
    }

    // Calculate aggregated value
    const aggregationType = check.aggregation_type || 'average';
    let aggregatedValue: number;

    switch (aggregationType) {
      case 'max':
        aggregatedValue = Math.max(...metrics.map((m: any) => m.maximum ?? m.average ?? 0));
        break;
      case 'min':
        aggregatedValue = Math.min(...metrics.map((m: any) => m.minimum ?? m.average ?? 0));
        break;
      case 'total':
        aggregatedValue = metrics.reduce((sum: number, m: any) => sum + (m.total ?? m.average ?? 0), 0);
        break;
      case 'average':
      default:
        const values = metrics.map((m: any) => m.average ?? 0);
        aggregatedValue = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        break;
    }

    // Compare against threshold
    const threshold = check.metric_threshold_value ?? 0;
    const operator = check.metric_comparison_operator || 'gt';
    const thresholdBreached = compareValues(aggregatedValue, operator, threshold);

    const operatorSymbols: Record<string, string> = { gt: '>', gte: '≥', lt: '<', lte: '≤' };

    return {
      monitoring_check_id: check.id,
      status: thresholdBreached ? 'failure' : 'success',
      response_time_ms: Math.round(aggregatedValue * 100) / 100, // Store value in response_time for reference
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: thresholdBreached
        ? `${check.azure_metric_name} is ${aggregatedValue.toFixed(2)} (threshold: ${operatorSymbols[operator]} ${threshold})`
        : null,
    };
  } catch (error) {
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: null,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: error instanceof Error ? error.message : 'Azure metric check failed',
    };
  }
}

// Execute Azure Health check - placeholder for resource health status
async function executeAzureHealthCheck(check: MonitoringCheck, supabaseClient: any): Promise<CheckResult> {
  // Azure Health checks monitor the general health/optimization score of the resource
  if (!supabaseClient) {
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: null,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: 'Supabase client not available for Azure health check',
    };
  }

  try {
    const { data: resource } = await supabaseClient
      .from('resources')
      .select('azure_resource_id')
      .eq('id', check.resource_id)
      .single();

    if (!resource?.azure_resource_id) {
      return {
        monitoring_check_id: check.id,
        status: 'failure',
        response_time_ms: null,
        status_code: null,
        ssl_expiry_date: null,
        ssl_days_remaining: null,
        error_message: 'No Azure resource linked',
      };
    }

    // Check if we have recent sync data for this resource
    const { data: azureResource } = await supabaseClient
      .from('azure_resources')
      .select('synced_at, optimization_score')
      .eq('id', resource.azure_resource_id)
      .single();

    if (!azureResource) {
      return {
        monitoring_check_id: check.id,
        status: 'failure',
        response_time_ms: null,
        status_code: null,
        ssl_expiry_date: null,
        ssl_days_remaining: null,
        error_message: 'Azure resource not found in sync data',
      };
    }

    // Check if data is stale (>1 hour old)
    const syncedAt = new Date(azureResource.synced_at);
    const isStale = Date.now() - syncedAt.getTime() > 3600000;

    return {
      monitoring_check_id: check.id,
      status: isStale ? 'failure' : 'success',
      response_time_ms: azureResource.optimization_score,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: isStale ? 'Azure resource data is stale (>1 hour old)' : null,
    };
  } catch (error) {
    return {
      monitoring_check_id: check.id,
      status: 'failure',
      response_time_ms: null,
      status_code: null,
      ssl_expiry_date: null,
      ssl_days_remaining: null,
      error_message: error instanceof Error ? error.message : 'Azure health check failed',
    };
  }
}

// Execute a check with retry logic and confirmation
async function executeCheck(check: MonitoringCheck): Promise<CheckResult> {
  console.log(`Executing ${check.check_type} check for check ID: ${check.id}`);
  
  // Get retry config for this specific check
  const retryConfig = getRetryConfig(check);
  console.log(`Retry config for check ${check.id}: retries=${retryConfig.maxRetries}, retryDelay=${retryConfig.retryDelayMs}ms, confirmDelay=${retryConfig.confirmationDelayMs}ms`);
  
  // Initial check attempt
  let result = await executeSingleCheck(check);
  
  // If successful on first try, return immediately
  if (result.status === 'success') {
    return result;
  }
  
  // If retries are disabled (retry_count = 0), return immediately
  if (retryConfig.maxRetries === 0) {
    console.log(`Retries disabled for check ${check.id}, returning failure immediately`);
    return result;
  }
  
  console.log(`Initial check failed for ${check.id}, attempting retries...`);
  
  // Retry logic for failed checks
  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    console.log(`Retry attempt ${attempt}/${retryConfig.maxRetries} for check ${check.id}`);
    
    await sleep(retryConfig.retryDelayMs);
    result = await executeSingleCheck(check);
    
    if (result.status === 'success') {
      console.log(`Check ${check.id} succeeded on retry attempt ${attempt}`);
      return result;
    }
  }
  
  // All retries failed - perform confirmation check after a longer delay
  console.log(`All retries failed for check ${check.id}, performing confirmation check...`);
  await sleep(retryConfig.confirmationDelayMs);
  
  const confirmationResult = await executeSingleCheck(check);
  
  if (confirmationResult.status === 'success') {
    console.log(`Confirmation check succeeded for ${check.id} - likely a transient issue`);
    // Return success but add a note about the transient failure
    return {
      ...confirmationResult,
      error_message: null, // Clear any previous error since confirmation passed
    };
  }
  
  // Confirmation also failed - this is a real failure
  console.log(`Confirmation check also failed for ${check.id} - confirmed failure`);
  return {
    ...confirmationResult,
    error_message: `Confirmed failure after ${retryConfig.maxRetries} retries: ${confirmationResult.error_message || result.error_message || 'Unknown error'}`,
  };
}

// Determine resource status based on its check results
function determineResourceStatus(results: CheckResult[]): 'up' | 'degraded' | 'down' | 'unknown' {
  if (results.length === 0) return 'unknown';
  
  const failureCount = results.filter(r => r.status === 'failure').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  
  if (failureCount === results.length) return 'down';
  if (failureCount > 0 || warningCount > 0) return 'degraded';
  return 'up';
}

// Check if resource is in maintenance window
async function isInMaintenanceWindow(supabase: any, resourceId: string): Promise<boolean> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('maintenance_windows')
    .select('id')
    .eq('resource_id', resourceId)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .limit(1);
  
  if (error) {
    console.error('Error checking maintenance window:', error);
    return false;
  }
  
  return data && data.length > 0;
}

// Get applicable alert rules for a resource (both direct and template rules)
async function getApplicableAlertRules(
  supabase: any, 
  resourceId: string, 
  resourceType: string
): Promise<AlertRule[]> {
  // Get direct rules for this specific resource
  const { data: directRules, error: directError } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('resource_id', resourceId)
    .eq('is_enabled', true);

  if (directError) {
    console.error('Error fetching direct rules:', directError);
  }

  // Get template rules for this resource type
  const { data: templateRules, error: templateError } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('is_template', true)
    .eq('is_enabled', true);

  if (templateError) {
    console.error('Error fetching template rules:', templateError);
  }

  // Check for exclusions on template rules
  const applicableTemplates: AlertRule[] = [];
  if (templateRules && templateRules.length > 0) {
    const templateIds = templateRules.map((r: AlertRule) => r.id);
    
    const { data: exclusions } = await supabase
      .from('alert_rule_exclusions')
      .select('alert_rule_id')
      .eq('resource_id', resourceId)
      .in('alert_rule_id', templateIds);

    const excludedRuleIds = new Set(exclusions?.map((e: any) => e.alert_rule_id) || []);
    
    for (const template of templateRules) {
      if (!excludedRuleIds.has(template.id)) {
        applicableTemplates.push(template);
      }
    }
  }

  return [...(directRules || []), ...applicableTemplates];
}

// Update failure count and check if threshold is reached
async function updateFailureCount(
  supabase: any, 
  check: MonitoringCheck, 
  isFailure: boolean
): Promise<{ shouldAlert: boolean; newCount: number }> {
  const threshold = check.failure_threshold || 1;
  let newCount = isFailure ? (check.current_failure_count || 0) + 1 : 0;
  
  // Update the failure count in database
  const { error } = await supabase
    .from('monitoring_checks')
    .update({ current_failure_count: newCount })
    .eq('id', check.id);
  
  if (error) {
    console.error(`Error updating failure count for check ${check.id}:`, error);
  }
  
  // Only alert if we've reached the threshold
  const shouldAlert = isFailure && newCount >= threshold;
  
  if (isFailure && newCount < threshold) {
    console.log(`Check ${check.id} failed (${newCount}/${threshold}), not alerting yet`);
  }
  
  return { shouldAlert, newCount };
}

// Compare values using comparison operator
function compareValues(actual: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'gt': return actual > threshold;
    case 'gte': return actual >= threshold;
    case 'lt': return actual < threshold;
    case 'lte': return actual <= threshold;
    case 'eq': return actual === threshold;
    case 'neq': return actual !== threshold;
    default: return false;
  }
}

// Evaluate an alert rule against a check result
function evaluateAlertRule(rule: AlertRule, result: CheckResult, consecutiveFailures: number): boolean {
  switch (rule.rule_type) {
    case 'consecutive_failures':
      return compareValues(consecutiveFailures, rule.comparison_operator, rule.threshold_value);
    
    case 'response_time':
      if (result.response_time_ms === null) return false;
      return compareValues(result.response_time_ms, rule.comparison_operator, rule.threshold_value);
    
    case 'ssl_expiry':
      if (result.ssl_days_remaining === null) return false;
      // For SSL, we typically want to alert when days remaining is LESS than threshold
      return compareValues(result.ssl_days_remaining, rule.comparison_operator, rule.threshold_value);
    
    case 'downtime':
      // Downtime percentage would need to be calculated over a period
      // For now, treat check failure as 100% downtime for that check
      const downtimePercent = result.status === 'failure' ? 100 : 0;
      return compareValues(downtimePercent, rule.comparison_operator, rule.threshold_value);
    
    default:
      console.log(`Unknown rule type: ${rule.rule_type}`);
      return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body for optional filters
    let checkId: string | null = null;
    let resourceId: string | null = null;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        checkId = body.check_id || null;
        resourceId = body.resource_id || null;
      } catch {
        // No body or invalid JSON, run all checks
      }
    }
    
    // Fetch enabled monitoring checks with resource info
    let query = supabase
      .from('monitoring_checks')
      .select('*, resources(id, name, resource_type)')
      .eq('is_enabled', true);
    
    if (checkId) {
      query = query.eq('id', checkId);
    } else if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }
    
    const { data: checks, error: fetchError } = await query;
    
    if (fetchError) {
      console.error('Error fetching checks:', fetchError);
      throw fetchError;
    }
    
    console.log(`Found ${checks?.length || 0} checks to execute`);
    
    if (!checks || checks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No enabled checks found', results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Filter out checks for resources in maintenance windows
    const checksToRun: typeof checks = [];
    const skippedChecks: { checkId: string; reason: string }[] = [];
    
    for (const check of checks) {
      const inMaintenance = await isInMaintenanceWindow(supabase, check.resource_id);
      if (inMaintenance) {
        skippedChecks.push({ checkId: check.id, reason: 'Resource in maintenance window' });
        console.log(`Skipping check ${check.id} - resource in maintenance window`);
      } else {
        checksToRun.push(check);
      }
    }
    
    if (checksToRun.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'All checks skipped due to maintenance windows', 
          results: [],
          skipped: skippedChecks,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Execute all checks concurrently
    const results = await Promise.all(
      checksToRun.map((check) => executeCheck(check as MonitoringCheck))
    );
    
    console.log(`Executed ${results.length} checks`);
    
    // Store results in database
    const { error: insertError } = await supabase
      .from('check_results')
      .insert(results);
    
    if (insertError) {
      console.error('Error inserting results:', insertError);
      throw insertError;
    }
    
    // Group results by resource_id
    const resultsByResource = new Map<string, { results: CheckResult[], resourceType: string, resourceName: string }>();
    for (let i = 0; i < checksToRun.length; i++) {
      const check = checksToRun[i] as any;
      const result = results[i];
      
      if (!resultsByResource.has(check.resource_id)) {
        resultsByResource.set(check.resource_id, {
          results: [],
          resourceType: check.resources?.resource_type || 'unknown',
          resourceName: check.resources?.name || 'Unknown Resource',
        });
      }
      resultsByResource.get(check.resource_id)!.results.push(result);
    }
    
    // Update resource statuses
    const statusUpdates: { id: string; status: string; last_checked_at: string }[] = [];
    
    for (const [resourceId, resourceData] of resultsByResource) {
      const status = determineResourceStatus(resourceData.results);
      statusUpdates.push({
        id: resourceId,
        status,
        last_checked_at: new Date().toISOString(),
      });
    }
    
    // Update resources
    for (const update of statusUpdates) {
      const { error: updateError } = await supabase
        .from('resources')
        .update({ status: update.status, last_checked_at: update.last_checked_at })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`Error updating resource ${update.id}:`, updateError);
      }
    }
    
    console.log(`Updated ${statusUpdates.length} resource statuses`);
    
    // Process failure counts and evaluate alert rules
    const alertsToCreate: { 
      resource_id: string; 
      severity: 'critical'; 
      message: string; 
      triggered_rule_id?: string;
      notification_suppressed?: boolean;
      suppression_reason?: string | null;
    }[] = [];
    
    // Track which rules triggered and their quiet hours status
    const triggeredRulesQuietHoursStatus = new Map<string, { suppressed: boolean; reason: string | null }>();
    
    for (let i = 0; i < checksToRun.length; i++) {
      const check = checksToRun[i] as MonitoringCheck & { resources?: { resource_type: string } };
      const result = results[i];
      const isFailure = result.status === 'failure';
      
      // Update failure count for this check
      const { shouldAlert: thresholdReached, newCount } = await updateFailureCount(supabase, check, isFailure);
      
      // Get resource type for rule matching
      const resourceType = check.resources?.resource_type || 'unknown';
      
      // Fetch applicable alert rules for this resource
      const applicableRules = await getApplicableAlertRules(supabase, check.resource_id, resourceType);
      
      // Evaluate each alert rule
      for (const rule of applicableRules) {
        const ruleTriggered = evaluateAlertRule(rule, result, newCount);
        
        if (ruleTriggered) {
          console.log(`Alert rule ${rule.id} (${rule.rule_type}) triggered for check ${check.id}`);
          
          // Check quiet hours for this rule
          const quietHoursStatus = isInQuietHours(rule);
          triggeredRulesQuietHoursStatus.set(rule.id, quietHoursStatus);
          
          let message = '';
          switch (rule.rule_type) {
            case 'consecutive_failures':
              message = `Check failed ${newCount} consecutive time(s) (threshold: ${rule.threshold_value})`;
              break;
            case 'response_time':
              message = `Response time ${result.response_time_ms}ms exceeded threshold ${rule.threshold_value}ms`;
              break;
            case 'ssl_expiry':
              message = `SSL certificate expires in ${result.ssl_days_remaining} days (threshold: ${rule.threshold_value} days)`;
              break;
            default:
              message = `${check.check_type.toUpperCase()} check alert: ${result.error_message || 'Threshold exceeded'}`;
          }
          
          alertsToCreate.push({
            resource_id: check.resource_id,
            severity: 'critical',
            message,
            triggered_rule_id: rule.id,
            notification_suppressed: quietHoursStatus.suppressed,
            suppression_reason: quietHoursStatus.reason,
          });
        }
      }
      
      // Fallback: Create alert on threshold if no rules matched but check failed
      if (thresholdReached && !applicableRules.some(r => evaluateAlertRule(r, result, newCount))) {
        alertsToCreate.push({
          resource_id: check.resource_id,
          severity: 'critical',
          message: `${check.check_type.toUpperCase()} check failed: ${result.error_message || 'Unknown error'}`,
          notification_suppressed: false,
          suppression_reason: null,
        });
      }
    }
    
    // Create alerts and send notifications
    if (alertsToCreate.length > 0) {
      const { data: createdAlerts, error: alertError } = await supabase
        .from('alerts')
        .insert(alertsToCreate.map(a => ({
          resource_id: a.resource_id,
          severity: a.severity,
          message: a.message,
          alert_rule_id: a.triggered_rule_id,
          notification_suppressed: a.notification_suppressed,
          suppression_reason: a.suppression_reason,
        })))
        .select();
      
      if (alertError) {
        console.error('Error creating alerts:', alertError);
      } else {
        console.log(`Created ${alertsToCreate.length} alerts`);
        
        // Get global notification channels
        const { data: globalChannels } = await supabase
          .from('notification_channels')
          .select('*')
          .eq('is_enabled', true);
        
        // Process each alert and send notifications (only if not suppressed)
        for (let alertIdx = 0; alertIdx < (createdAlerts || []).length; alertIdx++) {
          const alert = createdAlerts[alertIdx];
          const originalAlert = alertsToCreate[alertIdx];
          
          // Skip notification if suppressed due to quiet hours
          if (originalAlert.notification_suppressed) {
            console.log(`Skipping notification for alert ${alert.id} - ${originalAlert.suppression_reason}`);
            continue;
          }
          
          const resourceData = resultsByResource.get(alert.resource_id);
          const resourceName = resourceData?.resourceName || 'Unknown Resource';
          const resourceType = resourceData?.resourceType || 'unknown';
          
          const alertData = {
            title: `Alert: ${resourceName}`,
            message: alert.message,
            severity: alert.severity,
            resourceName,
          };
          
          // Get applicable alert rules (direct + template) for this resource
          const applicableRules = await getApplicableAlertRules(supabase, alert.resource_id, resourceType);
          console.log(`Found ${applicableRules.length} applicable alert rules for resource ${resourceName} (${resourceType})`);
          
          // Get notification channels linked to applicable alert rules
          const channelsToNotify = new Set<string>();
          
          if (applicableRules.length > 0) {
            const ruleIds = applicableRules.map(r => r.id);
            
            const { data: ruleChannels } = await supabase
              .from('alert_notification_channels')
              .select(`
                notification_channel_id,
                notification_channels!inner(
                  id,
                  channel_type,
                  configuration,
                  is_enabled
                )
              `)
              .in('alert_rule_id', ruleIds);
            
            for (const link of ruleChannels || []) {
              const channel = (link as any).notification_channels;
              if (channel?.is_enabled) {
                channelsToNotify.add(JSON.stringify({
                  type: channel.channel_type,
                  config: channel.configuration,
                }));
              }
            }
          }
          
          // If no specific channels from rules, use global channels
          if (channelsToNotify.size === 0 && globalChannels) {
            for (const channel of globalChannels) {
              channelsToNotify.add(JSON.stringify({
                type: channel.channel_type,
                config: channel.configuration,
              }));
            }
          }
          
          // Send notifications via send-notifications edge function
          for (const channelJson of channelsToNotify) {
            const channel = JSON.parse(channelJson);
            try {
              const notifyResponse = await fetch(
                `${supabaseUrl}/functions/v1/send-notifications`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    action: 'send',
                    channelType: channel.type,
                    channelConfig: channel.config,
                    alertData,
                  }),
                }
              );
              
              if (notifyResponse.ok) {
                console.log(`Notification sent via ${channel.type}`);
              } else {
                const errorText = await notifyResponse.text();
                console.error(`Failed to send ${channel.type} notification:`, errorText);
              }
            } catch (notifyError) {
              console.error(`Error sending ${channel.type} notification:`, notifyError);
            }
          }
        }
      }
    }
    
    return new Response(
      JSON.stringify({
        message: 'Checks executed successfully',
        total_checks: results.length,
        skipped_checks: skippedChecks.length,
        successful: results.filter(r => r.status === 'success').length,
        warnings: results.filter(r => r.status === 'warning').length,
        failures: results.filter(r => r.status === 'failure').length,
        alerts_created: alertsToCreate.length,
        notifications_suppressed: alertsToCreate.filter(a => a.notification_suppressed).length,
        results,
        skipped: skippedChecks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in execute-checks function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
