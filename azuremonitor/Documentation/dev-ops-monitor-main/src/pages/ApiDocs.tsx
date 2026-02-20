import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileJson, 
  FileText,
  ExternalLink, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight,
  Book,
  Code,
  Key,
  Zap,
  Server,
  Database,
  AlertTriangle,
  Activity,
  Wrench
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  summary: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responseExample?: any;
}

interface Parameter {
  name: string;
  in: "query" | "path";
  required?: boolean;
  type: string;
  description?: string;
  enum?: string[];
}

interface RequestBody {
  required?: boolean;
  example: any;
}

interface EndpointGroup {
  name: string;
  description: string;
  icon: React.ReactNode;
  endpoints: Endpoint[];
}

const endpointGroups: EndpointGroup[] = [
  {
    name: "Health",
    description: "API health and status checks",
    icon: <Activity className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/health",
        summary: "Health Check",
        description: "Check if the API is healthy. No authentication required.",
        responseExample: {
          success: true,
          data: {
            status: "healthy",
            timestamp: "2024-01-15T10:30:00.000Z"
          }
        }
      }
    ]
  },
  {
    name: "Dashboard",
    description: "Dashboard overview and statistics",
    icon: <Zap className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/dashboard/overview",
        summary: "Get Dashboard Overview",
        description: "Get summary statistics for the dashboard including client counts, resource counts, and active alerts.",
        responseExample: {
          success: true,
          data: {
            clients_count: 15,
            resources_count: 87,
            active_alerts_count: 3,
            open_incidents_count: 1,
            resource_status: { up: 82, down: 2, degraded: 3 }
          }
        }
      },
      {
        method: "GET",
        path: "/v1/dashboard/health",
        summary: "Get System Health",
        description: "Get overall system health statistics.",
        responseExample: {
          success: true,
          data: {
            overall_health: 94,
            total_resources: 87,
            healthy_resources: 82
          }
        }
      }
    ]
  },
  {
    name: "Clients",
    description: "Client management endpoints",
    icon: <Server className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/clients",
        summary: "List Clients",
        description: "Get a paginated list of all clients.",
        parameters: [
          { name: "page", in: "query", type: "integer", description: "Page number (default: 1)" },
          { name: "per_page", in: "query", type: "integer", description: "Items per page (default: 50, max: 100)" },
          { name: "status", in: "query", type: "string", enum: ["active", "inactive"], description: "Filter by status" },
          { name: "sort_by", in: "query", type: "string", description: "Field to sort by" },
          { name: "sort_order", in: "query", type: "string", enum: ["asc", "desc"], description: "Sort order" }
        ],
        responseExample: {
          success: true,
          data: [
            { id: "123e4567-e89b-12d3-a456-426614174000", name: "Acme Corp", status: "active", contact_email: "admin@acme.com" }
          ],
          meta: { page: 1, per_page: 50, total: 15, total_pages: 1 }
        }
      },
      {
        method: "GET",
        path: "/v1/clients/{id}",
        summary: "Get Client",
        description: "Get a client by ID with its environments.",
        parameters: [
          { name: "id", in: "path", required: true, type: "uuid", description: "Client ID" }
        ],
        responseExample: {
          success: true,
          data: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            name: "Acme Corp",
            status: "active",
            environments: [
              { id: "...", name: "Production" },
              { id: "...", name: "Staging" }
            ]
          }
        }
      },
      {
        method: "POST",
        path: "/v1/clients",
        summary: "Create Client",
        description: "Create a new client.",
        requestBody: {
          required: true,
          example: { name: "New Client Inc", contact_email: "contact@newclient.com", status: "active" }
        }
      },
      {
        method: "PUT",
        path: "/v1/clients/{id}",
        summary: "Update Client",
        description: "Update an existing client.",
        parameters: [
          { name: "id", in: "path", required: true, type: "uuid", description: "Client ID" }
        ],
        requestBody: {
          example: { name: "Updated Name", status: "inactive" }
        }
      },
      {
        method: "DELETE",
        path: "/v1/clients/{id}",
        summary: "Delete Client",
        description: "Delete a client.",
        parameters: [
          { name: "id", in: "path", required: true, type: "uuid", description: "Client ID" }
        ],
        responseExample: { success: true, data: { deleted: true } }
      }
    ]
  },
  {
    name: "Resources",
    description: "Resource management endpoints",
    icon: <Database className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/resources",
        summary: "List Resources",
        description: "Get a paginated list of resources with filters.",
        parameters: [
          { name: "client_id", in: "query", type: "uuid", description: "Filter by client" },
          { name: "environment_id", in: "query", type: "uuid", description: "Filter by environment" },
          { name: "status", in: "query", type: "string", enum: ["up", "down", "degraded", "unknown"] },
          { name: "resource_type", in: "query", type: "string" }
        ]
      },
      {
        method: "GET",
        path: "/v1/resources/{id}",
        summary: "Get Resource",
        description: "Get resource by ID with monitoring checks and alerts."
      },
      {
        method: "POST",
        path: "/v1/resources",
        summary: "Create Resource",
        requestBody: {
          example: { name: "Web Server", resource_type: "web_server", environment_id: "..." }
        }
      },
      {
        method: "PUT",
        path: "/v1/resources/{id}",
        summary: "Update Resource"
      },
      {
        method: "DELETE",
        path: "/v1/resources/{id}",
        summary: "Delete Resource"
      }
    ]
  },
  {
    name: "Azure Resources",
    description: "Azure resource data and metrics",
    icon: <Database className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/azure/resources",
        summary: "List Azure Resources",
        parameters: [
          { name: "tenant_id", in: "query", type: "uuid" },
          { name: "resource_type", in: "query", type: "string" },
          { name: "resource_group", in: "query", type: "string" },
          { name: "location", in: "query", type: "string" }
        ]
      },
      {
        method: "GET",
        path: "/v1/azure/resources/{id}",
        summary: "Get Azure Resource"
      },
      {
        method: "GET",
        path: "/v1/azure/resources/{id}/metrics",
        summary: "Get Azure Resource Metrics",
        parameters: [
          { name: "date_from", in: "query", type: "date-time", description: "Start date (default: 24h ago)" },
          { name: "date_to", in: "query", type: "date-time", description: "End date (default: now)" }
        ]
      },
      {
        method: "GET",
        path: "/v1/azure/resources/{id}/costs",
        summary: "Get Azure Resource Cost History",
        parameters: [
          { name: "date_from", in: "query", type: "date" },
          { name: "date_to", in: "query", type: "date" }
        ]
      },
      {
        method: "GET",
        path: "/v1/azure/tenants",
        summary: "List Azure Tenants"
      }
    ]
  },
  {
    name: "Azure Costs",
    description: "Azure cost data and anomalies",
    icon: <Activity className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/azure/costs",
        summary: "List Cost Data",
        parameters: [
          { name: "tenant_id", in: "query", type: "uuid" },
          { name: "resource_group", in: "query", type: "string" },
          { name: "date_from", in: "query", type: "date" },
          { name: "date_to", in: "query", type: "date" }
        ]
      },
      {
        method: "GET",
        path: "/v1/azure/costs/summary",
        summary: "Get Cost Summary",
        parameters: [
          { name: "days", in: "query", type: "integer", description: "Days to look back (default: 30)" }
        ],
        responseExample: {
          success: true,
          data: {
            current_period_start: "2024-01-01",
            current_period_end: "2024-01-31",
            current_period_total: 12500.50,
            previous_period_total: 11200.00
          }
        }
      },
      {
        method: "GET",
        path: "/v1/azure/costs/anomalies",
        summary: "List Cost Anomalies",
        parameters: [
          { name: "tenant_id", in: "query", type: "uuid" },
          { name: "acknowledged", in: "query", type: "string", enum: ["true", "false"] }
        ]
      }
    ]
  },
  {
    name: "Alerts",
    description: "Alert management",
    icon: <AlertTriangle className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/alerts",
        summary: "List Alerts",
        parameters: [
          { name: "resource_id", in: "query", type: "uuid" },
          { name: "severity", in: "query", type: "string", enum: ["critical", "warning", "info"] },
          { name: "resolved", in: "query", type: "string", enum: ["true", "false"] },
          { name: "acknowledged", in: "query", type: "string", enum: ["true", "false"] }
        ]
      },
      {
        method: "GET",
        path: "/v1/alerts/{id}",
        summary: "Get Alert"
      },
      {
        method: "PUT",
        path: "/v1/alerts/{id}/acknowledge",
        summary: "Acknowledge Alert"
      },
      {
        method: "PUT",
        path: "/v1/alerts/{id}/resolve",
        summary: "Resolve Alert"
      }
    ]
  },
  {
    name: "Alert Rules",
    description: "Alert rule configuration",
    icon: <Wrench className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/alert-rules",
        summary: "List Alert Rules",
        parameters: [
          { name: "resource_id", in: "query", type: "uuid" },
          { name: "rule_type", in: "query", type: "string" },
          { name: "is_enabled", in: "query", type: "string", enum: ["true", "false"] }
        ]
      },
      {
        method: "POST",
        path: "/v1/alert-rules",
        summary: "Create Alert Rule",
        requestBody: {
          example: { name: "High CPU", rule_type: "azure_cpu_usage", threshold_value: 90, comparison_operator: ">" }
        }
      },
      {
        method: "PUT",
        path: "/v1/alert-rules/{id}",
        summary: "Update Alert Rule"
      },
      {
        method: "DELETE",
        path: "/v1/alert-rules/{id}",
        summary: "Delete Alert Rule"
      }
    ]
  },
  {
    name: "Incidents",
    description: "Incident management",
    icon: <AlertTriangle className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/incidents",
        summary: "List Incidents",
        parameters: [
          { name: "status", in: "query", type: "string", enum: ["open", "investigating", "resolved"] },
          { name: "severity", in: "query", type: "string", enum: ["critical", "warning", "info"] }
        ]
      },
      {
        method: "GET",
        path: "/v1/incidents/{id}",
        summary: "Get Incident"
      },
      {
        method: "POST",
        path: "/v1/incidents",
        summary: "Create Incident",
        requestBody: {
          example: { title: "Database connectivity issues", description: "Multiple services reporting timeouts", severity: "critical" }
        }
      },
      {
        method: "PUT",
        path: "/v1/incidents/{id}",
        summary: "Update Incident"
      },
      {
        method: "DELETE",
        path: "/v1/incidents/{id}",
        summary: "Delete Incident"
      }
    ]
  },
  {
    name: "Monitoring Checks",
    description: "Monitoring check configuration",
    icon: <Activity className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/monitoring-checks",
        summary: "List Monitoring Checks",
        parameters: [
          { name: "resource_id", in: "query", type: "uuid" },
          { name: "check_type", in: "query", type: "string", enum: ["http", "ping", "port", "ssl", "keyword", "heartbeat"] },
          { name: "is_enabled", in: "query", type: "string", enum: ["true", "false"] }
        ]
      },
      {
        method: "GET",
        path: "/v1/monitoring-checks/{id}",
        summary: "Get Monitoring Check",
        description: "Get monitoring check with recent results."
      },
      {
        method: "POST",
        path: "/v1/monitoring-checks",
        summary: "Create Monitoring Check",
        requestBody: {
          example: { resource_id: "...", check_type: "http", url: "https://example.com", check_interval_seconds: 60 }
        }
      },
      {
        method: "PUT",
        path: "/v1/monitoring-checks/{id}",
        summary: "Update Monitoring Check"
      },
      {
        method: "DELETE",
        path: "/v1/monitoring-checks/{id}",
        summary: "Delete Monitoring Check"
      }
    ]
  },
  {
    name: "Maintenance Windows",
    description: "Maintenance window management",
    icon: <Wrench className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/maintenance-windows",
        summary: "List Maintenance Windows",
        parameters: [
          { name: "resource_id", in: "query", type: "uuid" },
          { name: "active", in: "query", type: "string", enum: ["true", "false"], description: "Filter active windows" }
        ]
      },
      {
        method: "POST",
        path: "/v1/maintenance-windows",
        summary: "Create Maintenance Window",
        requestBody: {
          example: { resource_id: "...", title: "Server Update", starts_at: "2024-01-20T02:00:00Z", ends_at: "2024-01-20T04:00:00Z" }
        }
      },
      {
        method: "PUT",
        path: "/v1/maintenance-windows/{id}",
        summary: "Update Maintenance Window"
      },
      {
        method: "DELETE",
        path: "/v1/maintenance-windows/{id}",
        summary: "Delete Maintenance Window"
      }
    ]
  },
  {
    name: "Azure SQL",
    description: "Azure SQL insights and performance",
    icon: <Database className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        path: "/v1/azure/sql/{resourceId}/insights",
        summary: "Get SQL Query Insights",
        description: "Get top queries by CPU time."
      },
      {
        method: "GET",
        path: "/v1/azure/sql/{resourceId}/performance",
        summary: "Get SQL Performance Stats",
        parameters: [
          { name: "date_from", in: "query", type: "date-time", description: "Start date (default: 24h ago)" }
        ]
      },
      {
        method: "GET",
        path: "/v1/azure/sql/{resourceId}/recommendations",
        summary: "Get SQL Recommendations"
      },
      {
        method: "GET",
        path: "/v1/azure/sql/{resourceId}/wait-stats",
        summary: "Get SQL Wait Statistics"
      }
    ]
  }
];

const methodColors: Record<string, string> = {
  GET: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
  POST: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(label ? `${label} copied!` : "Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 w-8 p-0">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [isOpen, setIsOpen] = useState(false);
  const fullUrl = `${API_BASE_URL}${endpoint.path}`;

  const curlExample = `curl -X ${endpoint.method} "${fullUrl}" \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json"${
    endpoint.requestBody ? ` \\
  -d '${JSON.stringify(endpoint.requestBody.example)}'` : ""
  }`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors text-left">
          <Badge className={`${methodColors[endpoint.method]} border font-mono text-xs min-w-16 justify-center`}>
            {endpoint.method}
          </Badge>
          <code className="text-sm font-mono text-muted-foreground flex-1">{endpoint.path}</code>
          <span className="text-sm text-foreground">{endpoint.summary}</span>
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-4 pl-4 border-l-2 border-muted pb-4 space-y-4">
          {endpoint.description && (
            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
          )}

          {endpoint.parameters && endpoint.parameters.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2">Parameters</h5>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {endpoint.parameters.map((param) => (
                  <div key={param.name} className="flex items-start gap-2 text-sm">
                    <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono">
                      {param.name}
                    </code>
                    <Badge variant="outline" className="text-xs">
                      {param.in}
                    </Badge>
                    {param.required && (
                      <Badge variant="destructive" className="text-xs">required</Badge>
                    )}
                    <span className="text-muted-foreground">
                      {param.type}
                      {param.enum && ` (${param.enum.join(" | ")})`}
                      {param.description && ` - ${param.description}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {endpoint.requestBody && (
            <div>
              <h5 className="text-sm font-medium mb-2">Request Body</h5>
              <div className="bg-muted/50 rounded-lg p-3 relative">
                <CopyButton text={JSON.stringify(endpoint.requestBody.example, null, 2)} label="Request body" />
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(endpoint.requestBody.example, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {endpoint.responseExample && (
            <div>
              <h5 className="text-sm font-medium mb-2">Example Response</h5>
              <div className="bg-muted/50 rounded-lg p-3 relative">
                <CopyButton text={JSON.stringify(endpoint.responseExample, null, 2)} label="Response" />
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(endpoint.responseExample, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div>
            <h5 className="text-sm font-medium mb-2">cURL Example</h5>
            <div className="bg-muted/50 rounded-lg p-3 relative">
              <CopyButton text={curlExample} label="cURL command" />
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{curlExample}</pre>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ApiDocs() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Book className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">API Documentation</h1>
              <p className="text-muted-foreground">Quartz Monitoring Public REST API v1</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/api-docs/openapi.yaml" download>
                <FileJson className="h-4 w-4 mr-2" />
                Download OpenAPI Spec
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/api-docs/API_DOCUMENTATION.md" download>
                <FileText className="h-4 w-4 mr-2" />
                Download Markdown
              </a>
            </Button>
          </div>
        </div>

        {/* Quick Start */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Quick Start
            </CardTitle>
            <CardDescription>Get started with the API in minutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Base URL</h4>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                <code className="text-sm flex-1">{API_BASE_URL}</code>
                <CopyButton text={API_BASE_URL} label="Base URL" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Authentication</h4>
              <p className="text-sm text-muted-foreground">
                All endpoints (except <code>/v1/health</code>) require an API key passed in the <code>X-API-Key</code> header.
                Generate API keys in the Admin panel under "API Keys".
              </p>
              <div className="bg-muted rounded-lg p-3">
                <pre className="text-sm overflow-x-auto">
{`curl -X GET "${API_BASE_URL}/v1/dashboard/overview" \\
  -H "X-API-Key: qtz_your_api_key_here"`}
                </pre>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Success Response</h4>
                <div className="bg-muted rounded-lg p-3">
                  <pre className="text-xs">
{`{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 100,
    "total_pages": 2
  }
}`}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Error Response</h4>
                <div className="bg-muted rounded-lg p-3">
                  <pre className="text-xs">
{`{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Pagination</h4>
              <p className="text-sm text-muted-foreground">
                List endpoints support pagination via query parameters:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><code>page</code> - Page number (default: 1)</li>
                <li><code>per_page</code> - Items per page (default: 50, max: 100)</li>
                <li><code>sort_by</code> - Field to sort by</li>
                <li><code>sort_order</code> - <code>asc</code> or <code>desc</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Endpoints
            </CardTitle>
            <CardDescription>Complete API reference with examples</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {endpointGroups.map((group) => (
                  <div key={group.name} className="space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      {group.icon}
                      <h3 className="font-semibold">{group.name}</h3>
                      <span className="text-sm text-muted-foreground">— {group.description}</span>
                    </div>
                    <div className="space-y-1">
                      {group.endpoints.map((endpoint, idx) => (
                        <EndpointCard key={`${endpoint.method}-${endpoint.path}-${idx}`} endpoint={endpoint} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
