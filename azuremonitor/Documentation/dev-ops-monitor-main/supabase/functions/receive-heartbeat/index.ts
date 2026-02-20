import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the heartbeat token from URL params or request body
    const url = new URL(req.url);
    let token = url.searchParams.get('token');
    
    if (!token && req.method === 'POST') {
      try {
        const body = await req.json();
        token = body.token;
      } catch {
        // No body or invalid JSON
      }
    }
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing heartbeat token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Received heartbeat for token: ${token}`);
    
    // Find the monitoring check with this heartbeat token
    const { data: check, error: fetchError } = await supabase
      .from('monitoring_checks')
      .select('id, resource_id, is_enabled, check_type, resources(name)')
      .eq('heartbeat_token', token)
      .eq('check_type', 'heartbeat')
      .single();
    
    if (fetchError || !check) {
      console.error('Heartbeat token not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid heartbeat token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!check.is_enabled) {
      console.log(`Heartbeat check ${check.id} is disabled`);
      return new Response(
        JSON.stringify({ message: 'Heartbeat received but check is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update the last_heartbeat_at timestamp and reset failure count
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('monitoring_checks')
      .update({ 
        last_heartbeat_at: now,
        current_failure_count: 0, // Reset failure count on successful heartbeat
      })
      .eq('id', check.id);
    
    if (updateError) {
      console.error('Error updating heartbeat timestamp:', updateError);
      throw updateError;
    }
    
    const resourceName = (check.resources as any)?.name || 'Unknown Resource';
    console.log(`Heartbeat recorded for ${resourceName} (check ${check.id})`);
    
    // Also insert a check result record for tracking
    const { error: resultError } = await supabase
      .from('check_results')
      .insert({
        monitoring_check_id: check.id,
        status: 'success',
        response_time_ms: 0,
        status_code: null,
        ssl_expiry_date: null,
        ssl_days_remaining: null,
        error_message: null,
      });
    
    if (resultError) {
      console.error('Error inserting heartbeat result:', resultError);
    }
    
    // Update resource status to 'up' since we received a heartbeat
    const { error: resourceError } = await supabase
      .from('resources')
      .update({ 
        status: 'up',
        last_checked_at: now,
      })
      .eq('id', check.resource_id);
    
    if (resourceError) {
      console.error('Error updating resource status:', resourceError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Heartbeat received',
        resource: resourceName,
        timestamp: now,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in receive-heartbeat function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
