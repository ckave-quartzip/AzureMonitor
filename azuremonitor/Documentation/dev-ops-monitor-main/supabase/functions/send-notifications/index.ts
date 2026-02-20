import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface O365Credentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  senderEmail: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

interface TeamsPayload {
  webhookUrl: string;
  title: string;
  message: string;
  severity?: string;
  resourceName?: string;
  triggeredAt?: string;
  appUrl?: string;
}

// Get OAuth2 access token from Microsoft
async function getAccessToken(credentials: O365Credentials): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${credentials.tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.append("client_id", credentials.clientId);
  params.append("client_secret", credentials.clientSecret);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("grant_type", "client_credentials");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Token error:", error);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Send email via Microsoft Graph API
async function sendEmail(
  credentials: O365Credentials,
  payload: EmailPayload
): Promise<void> {
  const accessToken = await getAccessToken(credentials);

  const emailMessage = {
    message: {
      subject: payload.subject,
      body: {
        contentType: payload.isHtml ? "HTML" : "Text",
        content: payload.body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: payload.to,
          },
        },
      ],
    },
    saveToSentItems: true,
  };

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${credentials.senderEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailMessage),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Send email error:", error);
    throw new Error(`Failed to send email: ${response.status}`);
  }

  console.log(`Email sent successfully to ${payload.to}`);
}

// Send Microsoft Teams notification via Adaptive Card
async function sendTeamsNotification(payload: TeamsPayload): Promise<void> {
  // Severity-based styling
  const severityConfig: Record<string, { color: string; icon: string; style: string }> = {
    critical: { color: "attention", icon: "🔴", style: "attention" },
    warning: { color: "warning", icon: "🟠", style: "warning" },
    info: { color: "accent", icon: "🔵", style: "accent" },
  };
  
  const config = severityConfig[payload.severity || "info"] || severityConfig.info;
  const triggeredAt = payload.triggeredAt || new Date().toISOString();
  const formattedTime = new Date(triggeredAt).toLocaleString();
  const appUrl = payload.appUrl || "https://app.example.com";

  // Adaptive Card format
  const adaptiveCard = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            {
              type: "Container",
              style: config.style,
              items: [
                {
                  type: "TextBlock",
                  text: `${config.icon} ${payload.title}`,
                  weight: "bolder",
                  size: "large",
                  wrap: true,
                },
              ],
              bleed: true,
              padding: "default",
            },
            {
              type: "Container",
              items: [
                {
                  type: "TextBlock",
                  text: payload.message,
                  wrap: true,
                  spacing: "medium",
                },
                {
                  type: "FactSet",
                  spacing: "medium",
                  facts: [
                    {
                      title: "Severity",
                      value: (payload.severity || "info").toUpperCase(),
                    },
                    {
                      title: "Resource",
                      value: payload.resourceName || "Unknown",
                    },
                    {
                      title: "Triggered",
                      value: formattedTime,
                    },
                  ],
                },
              ],
            },
          ],
          actions: [
            {
              type: "Action.OpenUrl",
              title: "View Dashboard",
              url: appUrl,
            },
            {
              type: "Action.OpenUrl",
              title: "View Alert Details",
              url: `${appUrl}/alerts`,
            },
          ],
        },
      },
    ],
  };

  const response = await fetch(payload.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(adaptiveCard),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Teams notification error:", error);
    throw new Error(`Failed to send Teams notification: ${response.status}`);
  }

  console.log("Teams notification sent successfully");
}

// Get APP_URL from settings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAppUrl(supabaseAdmin: any): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc("get_decrypted_setting", {
    p_setting_key: "app_url",
  });

  if (error) {
    console.error("Error fetching app_url:", error);
    return null;
  }

  return data as string | null;
}

// Get O365 credentials from vault
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getO365Credentials(supabaseAdmin: any): Promise<O365Credentials | null> {
  const settings = ["ms_graph_tenant_id", "ms_graph_client_id", "ms_graph_client_secret", "ms_graph_sender_email"];
  const credentials: Record<string, string> = {};

  for (const key of settings) {
    const { data, error } = await supabaseAdmin.rpc("get_decrypted_setting", {
      p_setting_key: key,
    });

    if (error) {
      console.error(`Error fetching ${key}:`, error);
      return null;
    }

    if (!data) {
      console.log(`Missing setting: ${key}`);
      return null;
    }

    credentials[key] = data as string;
  }

  return {
    tenantId: credentials["ms_graph_tenant_id"],
    clientId: credentials["ms_graph_client_id"],
    clientSecret: credentials["ms_graph_client_secret"],
    senderEmail: credentials["ms_graph_sender_email"],
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client for vault access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header for user context
    const authHeader = req.headers.get("Authorization");
    let supabaseUser = null;
    
    if (authHeader) {
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
    }

    const body = await req.json();
    const { action, credentials: providedCredentials } = body;

    // Test connection action (called from admin UI)
    if (action === "test") {
      if (!providedCredentials) {
        return new Response(
          JSON.stringify({ success: false, error: "No credentials provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        // Just test getting an access token
        await getAccessToken(providedCredentials);
        return new Response(
          JSON.stringify({ success: true, message: "Connection successful" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(
          JSON.stringify({ success: false, error: message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Send notification action (called from execute-checks or directly)
    if (action === "send") {
      const { channelType, channelConfig, alertData } = body;

      if (channelType === "email") {
        // Get credentials from vault
        const creds = await getO365Credentials(supabaseAdmin);
        
        if (!creds) {
          console.error("O365 credentials not configured");
          return new Response(
            JSON.stringify({ success: false, error: "Email not configured" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">🚨 Alert Triggered</h1>
            </div>
            <div style="padding: 20px; background-color: #f9fafb;">
              <h2 style="color: #1f2937;">${alertData.title || "Alert"}</h2>
              <p style="color: #4b5563;">${alertData.message}</p>
              <div style="margin-top: 20px; padding: 15px; background-color: white; border-radius: 8px; border-left: 4px solid #dc2626;">
                <p style="margin: 0; color: #6b7280;"><strong>Severity:</strong> ${alertData.severity || "Unknown"}</p>
                <p style="margin: 5px 0 0; color: #6b7280;"><strong>Resource:</strong> ${alertData.resourceName || "Unknown"}</p>
                <p style="margin: 5px 0 0; color: #6b7280;"><strong>Time:</strong> ${new Date().toISOString()}</p>
              </div>
            </div>
            <div style="padding: 15px; background-color: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
              SystemsGuard Monitoring
            </div>
          </div>
        `;

        await sendEmail(creds, {
          to: channelConfig.email,
          subject: `[Alert] ${alertData.title || "System Alert"}`,
          body: emailHtml,
          isHtml: true,
        });

        return new Response(
          JSON.stringify({ success: true, message: "Email sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (channelType === "teams") {
        // Get APP_URL from settings
        const appUrl = await getAppUrl(supabaseAdmin);
        
        await sendTeamsNotification({
          webhookUrl: channelConfig.webhook_url || channelConfig.webhookUrl,
          title: alertData.alert_name || alertData.title || "Alert Triggered",
          message: alertData.message,
          severity: alertData.alert_severity || alertData.severity,
          resourceName: alertData.resource_name || alertData.resourceName,
          triggeredAt: alertData.triggered_at || new Date().toISOString(),
          appUrl: appUrl || undefined,
        });

        return new Response(
          JSON.stringify({ success: true, message: "Teams notification sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (channelType === "slack") {
        // Slack webhook
        const response = await fetch(channelConfig.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🚨 *${alertData.title || "Alert Triggered"}*\n${alertData.message}\n\n• Severity: ${alertData.severity || "Unknown"}\n• Resource: ${alertData.resourceName || "Unknown"}`,
          }),
        });

        if (!response.ok) {
          throw new Error(`Slack webhook failed: ${response.status}`);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Slack notification sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Unknown channel type" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-notifications:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
