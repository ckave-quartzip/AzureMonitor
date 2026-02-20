import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
};

// Response helpers
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function successResponse(data: any, meta?: any) {
  return jsonResponse({ success: true, data, ...(meta && { meta }) });
}

function errorResponse(code: string, message: string, status = 400, details?: any) {
  return jsonResponse({ success: false, error: { code, message, ...(details && { details }) } }, status);
}

// Hash API key using Web Crypto API
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate API key and return key info
async function validateApiKey(supabase: any, apiKey: string | null): Promise<{ valid: boolean; keyId?: string; keyName?: string }> {
  if (!apiKey) {
    return { valid: false };
  }

  const keyHash = await hashApiKey(apiKey);
  
  const { data, error } = await supabase.rpc('validate_api_key', { p_key_hash: keyHash });
  
  if (error || !data || data.length === 0) {
    console.log('API key validation failed:', error?.message || 'Key not found');
    return { valid: false };
  }

  const keyInfo = data[0];
  if (!keyInfo.is_valid) {
    console.log('API key is disabled or expired');
    return { valid: false };
  }

  // Update usage stats
  await supabase.rpc('update_api_key_usage', { p_key_id: keyInfo.key_id });

  return { valid: true, keyId: keyInfo.key_id, keyName: keyInfo.key_name };
}

// Parse URL path and extract route info
function parseRoute(pathname: string): { version: string; entity: string; id?: string; subEntity?: string; subId?: string; action?: string } {
  const parts = pathname.split('/').filter(Boolean);
  
  // Expected format: /v1/entity/:id?/subEntity?/:subId?
  const version = parts[0] || 'v1';
  const entity = parts[1] || '';
  const id = parts[2];
  const subEntity = parts[3];
  const subId = parts[4];
  
  // Check for action routes like /v1/alerts/:id/acknowledge
  let action: string | undefined;
  if (subEntity && !subId) {
    action = subEntity;
  }
  
  return { version, entity, id, subEntity: action ? undefined : subEntity, subId, action };
}

// Parse query parameters for pagination and filtering
function parseQueryParams(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '50', 10), 100);
  const sortBy = url.searchParams.get('sort_by');
  const sortOrder = url.searchParams.get('sort_order') || 'desc';
  
  return { page, perPage, sortBy, sortOrder, params: url.searchParams };
}

// Apply pagination to a query
function applyPagination(query: any, page: number, perPage: number) {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  return query.range(from, to);
}

// Build pagination meta
function buildPaginationMeta(page: number, perPage: number, total: number) {
  return {
    page,
    per_page: perPage,
    total,
    total_pages: Math.ceil(total / perPage),
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  console.log(`[Public API] ${method} ${pathname}`);

  // Initialize Supabase client with service role for API key validation
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Health check endpoint (no auth required)
  if (pathname === '/v1/health' || pathname === '/health') {
    return successResponse({ status: 'healthy', timestamp: new Date().toISOString() });
  }

  // Validate API key for all other endpoints
  const apiKey = req.headers.get('x-api-key');
  const keyValidation = await validateApiKey(supabase, apiKey);
  
  if (!keyValidation.valid) {
    return errorResponse('UNAUTHORIZED', 'Invalid or missing API key', 401);
  }

  console.log(`[Public API] Authenticated as: ${keyValidation.keyName}`);

  const route = parseRoute(pathname);
  const { page, perPage, sortBy, sortOrder, params } = parseQueryParams(url);

  try {
    // ============ DASHBOARD ============
    if (route.entity === 'dashboard') {
      if (route.id === 'overview') {
        const [clientsRes, resourcesRes, alertsRes, incidentsRes] = await Promise.all([
          supabase.from('clients').select('*', { count: 'exact', head: true }),
          supabase.from('resources').select('*', { count: 'exact' }),
          supabase.from('alerts').select('*', { count: 'exact' }).is('resolved_at', null),
          supabase.from('incidents').select('*', { count: 'exact' }).neq('status', 'resolved'),
        ]);

        const resources = resourcesRes.data || [];
        const statusCounts = resources.reduce((acc: any, r: any) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {});

        return successResponse({
          clients_count: clientsRes.count || 0,
          resources_count: resourcesRes.count || 0,
          active_alerts_count: alertsRes.count || 0,
          open_incidents_count: incidentsRes.count || 0,
          resource_status: statusCounts,
        });
      }

      if (route.id === 'health') {
        const { data: resources } = await supabase.from('resources').select('status');
        const total = resources?.length || 0;
        const healthy = resources?.filter((r: any) => r.status === 'up').length || 0;
        
        return successResponse({
          overall_health: total > 0 ? Math.round((healthy / total) * 100) : 100,
          total_resources: total,
          healthy_resources: healthy,
        });
      }
    }

    // ============ CLIENTS ============
    if (route.entity === 'clients') {
      if (method === 'GET' && !route.id) {
        let query = supabase.from('clients').select('*', { count: 'exact' });
        
        if (params.get('status')) query = query.eq('status', params.get('status'));
        if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        else query = query.order('created_at', { ascending: false });
        
        query = applyPagination(query, page, perPage);
        const { data, error, count } = await query;
        
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && route.id) {
        const { data, error } = await supabase
          .from('clients')
          .select('*, environments(*)')
          .eq('id', route.id)
          .single();
        
        if (error) throw error;
        if (!data) return errorResponse('NOT_FOUND', 'Client not found', 404);
        return successResponse(data);
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('clients').insert(body).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'PUT' && route.id) {
        const body = await req.json();
        const { data, error } = await supabase.from('clients').update(body).eq('id', route.id).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'DELETE' && route.id) {
        const { error } = await supabase.from('clients').delete().eq('id', route.id);
        if (error) throw error;
        return successResponse({ deleted: true });
      }
    }

    // ============ ENVIRONMENTS ============
    if (route.entity === 'environments') {
      if (method === 'GET' && !route.id) {
        let query = supabase.from('environments').select('*, clients(name)', { count: 'exact' });
        
        if (params.get('client_id')) query = query.eq('client_id', params.get('client_id'));
        if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        else query = query.order('created_at', { ascending: false });
        
        query = applyPagination(query, page, perPage);
        const { data, error, count } = await query;
        
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && route.id) {
        const { data, error } = await supabase
          .from('environments')
          .select('*, clients(name), resources(*)')
          .eq('id', route.id)
          .single();
        
        if (error) throw error;
        if (!data) return errorResponse('NOT_FOUND', 'Environment not found', 404);
        return successResponse(data);
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('environments').insert(body).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'PUT' && route.id) {
        const body = await req.json();
        const { data, error } = await supabase.from('environments').update(body).eq('id', route.id).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'DELETE' && route.id) {
        const { error } = await supabase.from('environments').delete().eq('id', route.id);
        if (error) throw error;
        return successResponse({ deleted: true });
      }
    }

    // ============ RESOURCES ============
    if (route.entity === 'resources') {
      if (method === 'GET' && !route.id) {
        let query = supabase.from('resources').select('*, environments(name, clients(name))', { count: 'exact' });
        
        if (params.get('client_id')) query = query.eq('client_id', params.get('client_id'));
        if (params.get('environment_id')) query = query.eq('environment_id', params.get('environment_id'));
        if (params.get('status')) query = query.eq('status', params.get('status'));
        if (params.get('resource_type')) query = query.eq('resource_type', params.get('resource_type'));
        if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        else query = query.order('created_at', { ascending: false });
        
        query = applyPagination(query, page, perPage);
        const { data, error, count } = await query;
        
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && route.id) {
        const { data, error } = await supabase
          .from('resources')
          .select('*, environments(name, clients(name)), monitoring_checks(*), alerts(*)') 
          .eq('id', route.id)
          .single();
        
        if (error) throw error;
        if (!data) return errorResponse('NOT_FOUND', 'Resource not found', 404);
        return successResponse(data);
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('resources').insert(body).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'PUT' && route.id) {
        const body = await req.json();
        const { data, error } = await supabase.from('resources').update(body).eq('id', route.id).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'DELETE' && route.id) {
        const { error } = await supabase.from('resources').delete().eq('id', route.id);
        if (error) throw error;
        return successResponse({ deleted: true });
      }
    }

    // ============ AZURE RESOURCES ============
    if (route.entity === 'azure' && route.id === 'resources') {
      const azureId = route.subEntity;
      const subRoute = route.subId;

      if (method === 'GET' && !azureId) {
        let query = supabase.from('azure_resources').select('*, azure_tenants(name)', { count: 'exact' });
        
        if (params.get('tenant_id')) query = query.eq('azure_tenant_id', params.get('tenant_id'));
        if (params.get('resource_type')) query = query.eq('resource_type', params.get('resource_type'));
        if (params.get('resource_group')) query = query.eq('resource_group', params.get('resource_group'));
        if (params.get('location')) query = query.eq('location', params.get('location'));
        if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        else query = query.order('name', { ascending: true });
        
        query = applyPagination(query, page, perPage);
        const { data, error, count } = await query;
        
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && azureId && !subRoute) {
        const { data, error } = await supabase
          .from('azure_resources')
          .select('*, azure_tenants(name)')
          .eq('id', azureId)
          .single();
        
        if (error) throw error;
        if (!data) return errorResponse('NOT_FOUND', 'Azure resource not found', 404);
        return successResponse(data);
      }

      if (method === 'GET' && azureId && subRoute === 'metrics') {
        const dateFrom = params.get('date_from') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const dateTo = params.get('date_to') || new Date().toISOString();
        
        const { data, error } = await supabase
          .from('azure_metrics')
          .select('*')
          .eq('azure_resource_id', azureId)
          .gte('timestamp_utc', dateFrom)
          .lte('timestamp_utc', dateTo)
          .order('timestamp_utc', { ascending: false })
          .limit(1000);
        
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'GET' && azureId && subRoute === 'costs') {
        const dateFrom = params.get('date_from');
        const dateTo = params.get('date_to');
        
        let query = supabase
          .from('azure_cost_data')
          .select('*')
          .eq('azure_resource_id', azureId)
          .order('usage_date', { ascending: false });
        
        if (dateFrom) query = query.gte('usage_date', dateFrom);
        if (dateTo) query = query.lte('usage_date', dateTo);
        
        const { data, error } = await query.limit(365);
        
        if (error) throw error;
        return successResponse(data);
      }
    }

    // ============ AZURE COSTS ============
    if (route.entity === 'azure' && route.id === 'costs') {
      const costAction = route.subEntity;
      
      if (method === 'GET' && !costAction) {
        const dateFrom = params.get('date_from');
        const dateTo = params.get('date_to');
        const groupBy = params.get('group_by'); // resource_group, meter_category, usage_date
        
        let query = supabase.from('azure_cost_data').select('*', { count: 'exact' });
        
        if (params.get('tenant_id')) query = query.eq('azure_tenant_id', params.get('tenant_id'));
        if (params.get('resource_group')) query = query.eq('resource_group', params.get('resource_group'));
        if (dateFrom) query = query.gte('usage_date', dateFrom);
        if (dateTo) query = query.lte('usage_date', dateTo);
        
        query = query.order('usage_date', { ascending: false });
        query = applyPagination(query, page, perPage);
        
        const { data, error, count } = await query;
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && costAction === 'summary') {
        const daysBack = parseInt(params.get('days') || '30', 10);
        const { data, error } = await supabase.rpc('get_rolling_cost_stats', { p_days_back: daysBack });
        
        if (error) throw error;
        return successResponse(data?.[0] || {});
      }

      if (method === 'GET' && costAction === 'anomalies') {
        let query = supabase.from('azure_cost_anomalies').select('*, azure_resources(name)', { count: 'exact' });
        
        if (params.get('tenant_id')) query = query.eq('azure_tenant_id', params.get('tenant_id'));
        if (params.get('acknowledged') === 'false') query = query.eq('is_acknowledged', false);
        
        query = query.order('anomaly_date', { ascending: false });
        query = applyPagination(query, page, perPage);
        
        const { data, error, count } = await query;
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }
    }

    // Handle cost anomaly acknowledgment
    if (route.entity === 'azure' && route.id === 'costs' && route.subEntity === 'anomalies' && route.subId && route.action === 'acknowledge') {
      if (method === 'PUT') {
        const { data, error } = await supabase
          .from('azure_cost_anomalies')
          .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
          .eq('id', route.subId)
          .select()
          .single();
        
        if (error) throw error;
        return successResponse(data);
      }
    }

    // ============ ALERTS ============
    if (route.entity === 'alerts') {
      if (method === 'GET' && !route.id) {
        let query = supabase.from('alerts').select('*, resources(name), alert_rules(name)', { count: 'exact' });
        
        if (params.get('resource_id')) query = query.eq('resource_id', params.get('resource_id'));
        if (params.get('severity')) query = query.eq('severity', params.get('severity'));
        if (params.get('resolved') === 'false') query = query.is('resolved_at', null);
        if (params.get('resolved') === 'true') query = query.not('resolved_at', 'is', null);
        if (params.get('acknowledged') === 'false') query = query.is('acknowledged_at', null);
        if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        else query = query.order('triggered_at', { ascending: false });
        
        query = applyPagination(query, page, perPage);
        const { data, error, count } = await query;
        
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && route.id && !route.action) {
        const { data, error } = await supabase
          .from('alerts')
          .select('*, resources(name), alert_rules(name)')
          .eq('id', route.id)
          .single();
        
        if (error) throw error;
        if (!data) return errorResponse('NOT_FOUND', 'Alert not found', 404);
        return successResponse(data);
      }

      if (method === 'PUT' && route.id && route.action === 'acknowledge') {
        const { data, error } = await supabase
          .from('alerts')
          .update({ acknowledged_at: new Date().toISOString() })
          .eq('id', route.id)
          .select()
          .single();
        
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'PUT' && route.id && route.action === 'resolve') {
        const { data, error } = await supabase
          .from('alerts')
          .update({ resolved_at: new Date().toISOString() })
          .eq('id', route.id)
          .select()
          .single();
        
        if (error) throw error;
        return successResponse(data);
      }
    }

    // ============ ALERT RULES ============
    if (route.entity === 'alert-rules') {
      if (method === 'GET' && !route.id) {
        let query = supabase.from('alert_rules').select('*', { count: 'exact' });
        
        if (params.get('resource_id')) query = query.eq('resource_id', params.get('resource_id'));
        if (params.get('rule_type')) query = query.eq('rule_type', params.get('rule_type'));
        if (params.get('is_enabled') !== undefined) query = query.eq('is_enabled', params.get('is_enabled') === 'true');
        if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        else query = query.order('created_at', { ascending: false });
        
        query = applyPagination(query, page, perPage);
        const { data, error, count } = await query;
        
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && route.id) {
        const { data, error } = await supabase
          .from('alert_rules')
          .select('*')
          .eq('id', route.id)
          .single();
        
        if (error) throw error;
        if (!data) return errorResponse('NOT_FOUND', 'Alert rule not found', 404);
        return successResponse(data);
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('alert_rules').insert(body).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'PUT' && route.id) {
        const body = await req.json();
        const { data, error } = await supabase.from('alert_rules').update(body).eq('id', route.id).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'DELETE' && route.id) {
        const { error } = await supabase.from('alert_rules').delete().eq('id', route.id);
        if (error) throw error;
        return successResponse({ deleted: true });
      }
    }

    // ============ INCIDENTS ============
    if (route.entity === 'incidents') {
      if (method === 'GET' && !route.id) {
        let query = supabase.from('incidents').select('*', { count: 'exact' });
        
        if (params.get('status')) query = query.eq('status', params.get('status'));
        if (params.get('severity')) query = query.eq('severity', params.get('severity'));
        if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        else query = query.order('started_at', { ascending: false });
        
        query = applyPagination(query, page, perPage);
        const { data, error, count } = await query;
        
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && route.id) {
        const { data, error } = await supabase
          .from('incidents')
          .select('*, incident_alerts(*, alerts(*))')
          .eq('id', route.id)
          .single();
        
        if (error) throw error;
        if (!data) return errorResponse('NOT_FOUND', 'Incident not found', 404);
        return successResponse(data);
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('incidents').insert(body).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'PUT' && route.id) {
        const body = await req.json();
        const { data, error } = await supabase.from('incidents').update(body).eq('id', route.id).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'DELETE' && route.id) {
        const { error } = await supabase.from('incidents').delete().eq('id', route.id);
        if (error) throw error;
        return successResponse({ deleted: true });
      }
    }

    // ============ MONITORING CHECKS ============
    if (route.entity === 'monitoring-checks') {
      if (method === 'GET' && !route.id) {
        let query = supabase.from('monitoring_checks').select('*, resources(name)', { count: 'exact' });
        
        if (params.get('resource_id')) query = query.eq('resource_id', params.get('resource_id'));
        if (params.get('check_type')) query = query.eq('check_type', params.get('check_type'));
        if (params.get('is_enabled') !== undefined) query = query.eq('is_enabled', params.get('is_enabled') === 'true');
        if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        else query = query.order('created_at', { ascending: false });
        
        query = applyPagination(query, page, perPage);
        const { data, error, count } = await query;
        
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && route.id) {
        const { data: check, error } = await supabase
          .from('monitoring_checks')
          .select('*, resources(name)')
          .eq('id', route.id)
          .single();
        
        if (error) throw error;
        if (!check) return errorResponse('NOT_FOUND', 'Monitoring check not found', 404);

        // Get recent check results
        const { data: results } = await supabase
          .from('check_results')
          .select('*')
          .eq('monitoring_check_id', route.id)
          .order('checked_at', { ascending: false })
          .limit(50);

        return successResponse({ ...check, recent_results: results || [] });
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('monitoring_checks').insert(body).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'PUT' && route.id) {
        const body = await req.json();
        const { data, error } = await supabase.from('monitoring_checks').update(body).eq('id', route.id).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'DELETE' && route.id) {
        const { error } = await supabase.from('monitoring_checks').delete().eq('id', route.id);
        if (error) throw error;
        return successResponse({ deleted: true });
      }
    }

    // ============ MAINTENANCE WINDOWS ============
    if (route.entity === 'maintenance-windows') {
      if (method === 'GET' && !route.id) {
        let query = supabase.from('maintenance_windows').select('*, resources(name)', { count: 'exact' });
        
        if (params.get('resource_id')) query = query.eq('resource_id', params.get('resource_id'));
        if (params.get('active') === 'true') {
          const now = new Date().toISOString();
          query = query.lte('starts_at', now).gte('ends_at', now);
        }
        if (sortBy) query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        else query = query.order('starts_at', { ascending: false });
        
        query = applyPagination(query, page, perPage);
        const { data, error, count } = await query;
        
        if (error) throw error;
        return successResponse(data, buildPaginationMeta(page, perPage, count || 0));
      }

      if (method === 'GET' && route.id) {
        const { data, error } = await supabase
          .from('maintenance_windows')
          .select('*, resources(name)')
          .eq('id', route.id)
          .single();
        
        if (error) throw error;
        if (!data) return errorResponse('NOT_FOUND', 'Maintenance window not found', 404);
        return successResponse(data);
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase.from('maintenance_windows').insert(body).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'PUT' && route.id) {
        const body = await req.json();
        const { data, error } = await supabase.from('maintenance_windows').update(body).eq('id', route.id).select().single();
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'DELETE' && route.id) {
        const { error } = await supabase.from('maintenance_windows').delete().eq('id', route.id);
        if (error) throw error;
        return successResponse({ deleted: true });
      }
    }

    // ============ SQL INSIGHTS ============
    if (route.entity === 'azure' && route.id === 'sql') {
      const resourceId = route.subEntity;
      const sqlAction = route.subId;

      if (!resourceId) {
        return errorResponse('BAD_REQUEST', 'Resource ID is required', 400);
      }

      if (method === 'GET' && sqlAction === 'insights') {
        const { data, error } = await supabase
          .from('azure_sql_insights')
          .select('*')
          .eq('azure_resource_id', resourceId)
          .order('total_cpu_time_ms', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'GET' && sqlAction === 'performance') {
        const dateFrom = params.get('date_from') || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data, error } = await supabase
          .from('azure_sql_performance_stats')
          .select('*')
          .eq('azure_resource_id', resourceId)
          .gte('timestamp_utc', dateFrom)
          .order('timestamp_utc', { ascending: false })
          .limit(500);
        
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'GET' && sqlAction === 'recommendations') {
        const { data, error } = await supabase
          .from('azure_sql_recommendations')
          .select('*')
          .eq('azure_resource_id', resourceId)
          .eq('is_resolved', false)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return successResponse(data);
      }

      if (method === 'GET' && sqlAction === 'wait-stats') {
        const { data, error } = await supabase
          .from('azure_sql_wait_stats')
          .select('*')
          .eq('azure_resource_id', resourceId)
          .order('wait_time_ms', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        return successResponse(data);
      }
    }

    // ============ AZURE TENANTS ============
    if (route.entity === 'azure' && route.id === 'tenants') {
      if (method === 'GET' && !route.subEntity) {
        const { data, error } = await supabase
          .from('azure_tenants')
          .select('id, name, tenant_id, subscription_id, is_enabled, last_sync_at, created_at')
          .order('name', { ascending: true });
        
        if (error) throw error;
        return successResponse(data);
      }
    }

    // ============ 404 NOT FOUND ============
    return errorResponse('NOT_FOUND', `Endpoint not found: ${method} ${pathname}`, 404);

  } catch (error: any) {
    console.error('[Public API] Error:', error);
    return errorResponse('INTERNAL_ERROR', error.message || 'An unexpected error occurred', 500);
  }
});
