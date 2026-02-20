# Quartz Monitoring Public REST API

**Version:** 1.0.0  
**Base URL:** `https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1`

## Authentication

All API requests require authentication using an API key. Include your API key in the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-key-here" https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/health
```

## Response Format

All responses are returned in JSON format with the following structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## Health Endpoints

### Check API Health

Check the health status of the API.

- **Method:** `GET`
- **Path:** `/health`

**Example Request:**
```bash
curl -X GET \
  -H "X-API-Key: your-api-key-here" \
  "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/health"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Dashboard Endpoints

### Get Dashboard Summary

Get comprehensive dashboard statistics including resource counts, alerts, and uptime metrics.

- **Method:** `GET`
- **Path:** `/dashboard/summary`

**Example Request:**
```bash
curl -X GET \
  -H "X-API-Key: your-api-key-here" \
  "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/dashboard/summary"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "resources": {
      "total": 45,
      "up": 42,
      "down": 2,
      "degraded": 1
    },
    "alerts": {
      "active": 5,
      "critical": 2,
      "warning": 3
    },
    "uptime": {
      "average": 99.5,
      "period": "30d"
    }
  }
}
```

---

## Client Endpoints

### List All Clients

Retrieve a list of all clients with optional filtering by status.

- **Method:** `GET`
- **Path:** `/clients`
- **Query Parameters:**
  - `status` (optional): Filter by client status (active, inactive)
  - `limit` (optional): Number of results to return (default: 50)
  - `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```bash
curl -X GET \
  -H "X-API-Key: your-api-key-here" \
  "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/clients?status=active&limit=10"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Acme Corporation",
      "status": "active",
      "contact_email": "admin@acme.com",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "limit": 10,
    "offset": 0
  }
}
```

### Get Client by ID

Retrieve details for a specific client.

- **Method:** `GET`
- **Path:** `/clients/{id}`
- **Path Parameters:**
  - `id` (required): Client UUID

**Example Request:**
```bash
curl -X GET \
  -H "X-API-Key: your-api-key-here" \
  "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/clients/550e8400-e29b-41d4-a716-446655440000"
```

### Create Client

Create a new client.

- **Method:** `POST`
- **Path:** `/clients`

**Request Body:**
```json
{
  "name": "New Client",
  "contact_email": "contact@newclient.com",
  "description": "Client description"
}
```

**Example Request:**
```bash
curl -X POST \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Client","contact_email":"contact@newclient.com"}' \
  "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/clients"
```

### Update Client

Update an existing client.

- **Method:** `PUT`
- **Path:** `/clients/{id}`
- **Path Parameters:**
  - `id` (required): Client UUID

**Request Body:**
```json
{
  "name": "Updated Client Name",
  "status": "active"
}
```

### Delete Client

Delete a client.

- **Method:** `DELETE`
- **Path:** `/clients/{id}`
- **Path Parameters:**
  - `id` (required): Client UUID

---

## Environment Endpoints

### List Client Environments

Get all environments for a specific client.

- **Method:** `GET`
- **Path:** `/clients/{clientId}/environments`
- **Path Parameters:**
  - `clientId` (required): Client UUID

**Example Request:**
```bash
curl -X GET \
  -H "X-API-Key: your-api-key-here" \
  "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/clients/550e8400-e29b-41d4-a716-446655440000/environments"
```

### Create Environment

Create a new environment for a client.

- **Method:** `POST`
- **Path:** `/clients/{clientId}/environments`

**Request Body:**
```json
{
  "name": "Production",
  "description": "Production environment"
}
```

---

## Resource Endpoints

### List All Resources

Retrieve all monitored resources with optional filtering.

- **Method:** `GET`
- **Path:** `/resources`
- **Query Parameters:**
  - `status` (optional): Filter by status (up, down, degraded, unknown)
  - `resource_type` (optional): Filter by resource type
  - `client_id` (optional): Filter by client UUID
  - `environment_id` (optional): Filter by environment UUID
  - `limit` (optional): Number of results (default: 50)
  - `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```bash
curl -X GET \
  -H "X-API-Key: your-api-key-here" \
  "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/resources?status=up&limit=20"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Production API",
      "resource_type": "api",
      "status": "up",
      "last_checked_at": "2024-01-15T10:30:00Z",
      "client_id": "550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

### Get Resource by ID

Retrieve details for a specific resource.

- **Method:** `GET`
- **Path:** `/resources/{id}`

### Create Resource

Create a new monitored resource.

- **Method:** `POST`
- **Path:** `/resources`

**Request Body:**
```json
{
  "name": "New API Endpoint",
  "resource_type": "api",
  "description": "Main API endpoint",
  "client_id": "550e8400-e29b-41d4-a716-446655440000",
  "environment_id": "550e8400-e29b-41d4-a716-446655440002"
}
```

### Update Resource

Update an existing resource.

- **Method:** `PUT`
- **Path:** `/resources/{id}`

### Delete Resource

Delete a resource.

- **Method:** `DELETE`
- **Path:** `/resources/{id}`

### Get Resource Status

Get the current status and recent check results for a resource.

- **Method:** `GET`
- **Path:** `/resources/{id}/status`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "resource_id": "550e8400-e29b-41d4-a716-446655440001",
    "current_status": "up",
    "last_check": {
      "checked_at": "2024-01-15T10:30:00Z",
      "response_time_ms": 145,
      "status_code": 200
    },
    "uptime_24h": 99.9,
    "uptime_7d": 99.5,
    "uptime_30d": 99.2
  }
}
```

### Get Resource Uptime

Get uptime statistics for a resource.

- **Method:** `GET`
- **Path:** `/resources/{id}/uptime`
- **Query Parameters:**
  - `period` (optional): Time period - 24h, 7d, 30d, 90d (default: 30d)

---

## Alert Endpoints

### List All Alerts

Retrieve all alerts with optional filtering.

- **Method:** `GET`
- **Path:** `/alerts`
- **Query Parameters:**
  - `severity` (optional): Filter by severity (critical, warning, info)
  - `status` (optional): Filter by status (active, acknowledged, resolved)
  - `resource_id` (optional): Filter by resource UUID
  - `limit` (optional): Number of results (default: 50)
  - `offset` (optional): Pagination offset (default: 0)

**Example Request:**
```bash
curl -X GET \
  -H "X-API-Key: your-api-key-here" \
  "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/alerts?severity=critical&status=active"
```

### Get Alert by ID

Retrieve details for a specific alert.

- **Method:** `GET`
- **Path:** `/alerts/{id}`

### Acknowledge Alert

Acknowledge an active alert.

- **Method:** `POST`
- **Path:** `/alerts/{id}/acknowledge`

**Example Request:**
```bash
curl -X POST \
  -H "X-API-Key: your-api-key-here" \
  "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1/alerts/550e8400-e29b-41d4-a716-446655440003/acknowledge"
```

### Resolve Alert

Mark an alert as resolved.

- **Method:** `POST`
- **Path:** `/alerts/{id}/resolve`

---

## Alert Rule Endpoints

### List Alert Rules

Retrieve all configured alert rules.

- **Method:** `GET`
- **Path:** `/alert-rules`

### Get Alert Rule by ID

Retrieve details for a specific alert rule.

- **Method:** `GET`
- **Path:** `/alert-rules/{id}`

### Create Alert Rule

Create a new alert rule.

- **Method:** `POST`
- **Path:** `/alert-rules`

**Request Body:**
```json
{
  "name": "High CPU Alert",
  "rule_type": "azure_cpu_usage",
  "threshold_value": 90,
  "comparison_operator": ">=",
  "is_enabled": true
}
```

### Update Alert Rule

Update an existing alert rule.

- **Method:** `PUT`
- **Path:** `/alert-rules/{id}`

### Delete Alert Rule

Delete an alert rule.

- **Method:** `DELETE`
- **Path:** `/alert-rules/{id}`

---

## Incident Endpoints

### List All Incidents

Retrieve all incidents with optional filtering.

- **Method:** `GET`
- **Path:** `/incidents`
- **Query Parameters:**
  - `status` (optional): Filter by status (open, investigating, resolved)
  - `severity` (optional): Filter by severity (critical, warning, info)
  - `limit` (optional): Number of results (default: 50)
  - `offset` (optional): Pagination offset (default: 0)

### Get Incident by ID

Retrieve details for a specific incident.

- **Method:** `GET`
- **Path:** `/incidents/{id}`

### Create Incident

Create a new incident.

- **Method:** `POST`
- **Path:** `/incidents`

**Request Body:**
```json
{
  "title": "API Outage",
  "description": "Production API is not responding",
  "severity": "critical"
}
```

### Update Incident

Update an existing incident.

- **Method:** `PUT`
- **Path:** `/incidents/{id}`

---

## Monitoring Check Endpoints

### List Monitoring Checks

Retrieve all monitoring check configurations.

- **Method:** `GET`
- **Path:** `/monitoring-checks`
- **Query Parameters:**
  - `resource_id` (optional): Filter by resource UUID
  - `check_type` (optional): Filter by type (http, ping, port, ssl, keyword, heartbeat)
  - `is_enabled` (optional): Filter by enabled status

### Get Monitoring Check by ID

Retrieve details for a specific monitoring check.

- **Method:** `GET`
- **Path:** `/monitoring-checks/{id}`

### Create Monitoring Check

Create a new monitoring check.

- **Method:** `POST`
- **Path:** `/monitoring-checks`

**Request Body:**
```json
{
  "resource_id": "550e8400-e29b-41d4-a716-446655440001",
  "check_type": "http",
  "url": "https://api.example.com/health",
  "check_interval_seconds": 60,
  "timeout_seconds": 30,
  "expected_status_code": 200
}
```

### Update Monitoring Check

Update an existing monitoring check.

- **Method:** `PUT`
- **Path:** `/monitoring-checks/{id}`

### Delete Monitoring Check

Delete a monitoring check.

- **Method:** `DELETE`
- **Path:** `/monitoring-checks/{id}`

### Get Check Results

Get recent results for a monitoring check.

- **Method:** `GET`
- **Path:** `/monitoring-checks/{id}/results`
- **Query Parameters:**
  - `limit` (optional): Number of results (default: 100)
  - `from` (optional): Start datetime (ISO 8601)
  - `to` (optional): End datetime (ISO 8601)

---

## Azure Endpoints

### List Azure Tenants

Retrieve all configured Azure tenants.

- **Method:** `GET`
- **Path:** `/azure/tenants`

### Get Azure Tenant by ID

Retrieve details for a specific Azure tenant.

- **Method:** `GET`
- **Path:** `/azure/tenants/{id}`

### List Azure Resources

Retrieve Azure resources with optional filtering.

- **Method:** `GET`
- **Path:** `/azure/resources`
- **Query Parameters:**
  - `tenant_id` (optional): Filter by Azure tenant UUID
  - `resource_type` (optional): Filter by Azure resource type
  - `resource_group` (optional): Filter by resource group name
  - `limit` (optional): Number of results (default: 50)
  - `offset` (optional): Pagination offset (default: 0)

### Get Azure Resource by ID

Retrieve details for a specific Azure resource.

- **Method:** `GET`
- **Path:** `/azure/resources/{id}`

### Get Azure Resource Metrics

Get metrics for an Azure resource.

- **Method:** `GET`
- **Path:** `/azure/resources/{id}/metrics`
- **Query Parameters:**
  - `metric_name` (optional): Filter by metric name
  - `from` (optional): Start datetime (ISO 8601)
  - `to` (optional): End datetime (ISO 8601)
  - `interval` (optional): Aggregation interval (PT1M, PT5M, PT1H, P1D)

### Get Azure Cost Summary

Get cost summary across Azure tenants.

- **Method:** `GET`
- **Path:** `/azure/costs/summary`
- **Query Parameters:**
  - `tenant_id` (optional): Filter by tenant UUID
  - `from` (optional): Start date (YYYY-MM-DD)
  - `to` (optional): End date (YYYY-MM-DD)

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total_cost": 15234.56,
    "currency": "USD",
    "period": {
      "from": "2024-01-01",
      "to": "2024-01-31"
    },
    "by_tenant": [
      {
        "tenant_id": "550e8400-e29b-41d4-a716-446655440004",
        "tenant_name": "Production",
        "cost": 10234.56
      }
    ]
  }
}
```

### Get Azure Cost by Resource Group

Get cost breakdown by Azure resource group.

- **Method:** `GET`
- **Path:** `/azure/costs/by-resource-group`
- **Query Parameters:**
  - `tenant_id` (optional): Filter by tenant UUID
  - `from` (optional): Start date (YYYY-MM-DD)
  - `to` (optional): End date (YYYY-MM-DD)

### Get Azure Cost Trend

Get daily cost trend data.

- **Method:** `GET`
- **Path:** `/azure/costs/trend`
- **Query Parameters:**
  - `tenant_id` (optional): Filter by tenant UUID
  - `days` (optional): Number of days (default: 30)

### List Azure Cost Alerts

Retrieve Azure cost-related alerts.

- **Method:** `GET`
- **Path:** `/azure/cost-alerts`
- **Query Parameters:**
  - `tenant_id` (optional): Filter by tenant UUID
  - `severity` (optional): Filter by severity
  - `status` (optional): Filter by status

### Get Azure Sync Status

Get the status of Azure data synchronization.

- **Method:** `GET`
- **Path:** `/azure/sync/status`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "last_sync": "2024-01-15T10:00:00Z",
    "status": "completed",
    "tenants": [
      {
        "tenant_id": "550e8400-e29b-41d4-a716-446655440004",
        "name": "Production",
        "last_sync": "2024-01-15T10:00:00Z",
        "status": "completed"
      }
    ]
  }
}
```

---

## Maintenance Window Endpoints

### List Maintenance Windows

Retrieve all maintenance windows.

- **Method:** `GET`
- **Path:** `/maintenance-windows`
- **Query Parameters:**
  - `resource_id` (optional): Filter by resource UUID
  - `active` (optional): Filter currently active windows (true/false)

### Get Maintenance Window by ID

Retrieve details for a specific maintenance window.

- **Method:** `GET`
- **Path:** `/maintenance-windows/{id}`

### Create Maintenance Window

Create a new maintenance window.

- **Method:** `POST`
- **Path:** `/maintenance-windows`

**Request Body:**
```json
{
  "resource_id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "Scheduled Maintenance",
  "description": "Database upgrade",
  "starts_at": "2024-01-20T02:00:00Z",
  "ends_at": "2024-01-20T04:00:00Z"
}
```

### Update Maintenance Window

Update an existing maintenance window.

- **Method:** `PUT`
- **Path:** `/maintenance-windows/{id}`

### Delete Maintenance Window

Delete a maintenance window.

- **Method:** `DELETE`
- **Path:** `/maintenance-windows/{id}`

---

## Notification Channel Endpoints

### List Notification Channels

Retrieve all configured notification channels.

- **Method:** `GET`
- **Path:** `/notification-channels`

### Get Notification Channel by ID

Retrieve details for a specific notification channel.

- **Method:** `GET`
- **Path:** `/notification-channels/{id}`

### Create Notification Channel

Create a new notification channel.

- **Method:** `POST`
- **Path:** `/notification-channels`

**Request Body:**
```json
{
  "name": "Slack Alerts",
  "channel_type": "slack",
  "configuration": {
    "webhook_url": "https://hooks.slack.com/services/..."
  },
  "is_enabled": true
}
```

### Update Notification Channel

Update an existing notification channel.

- **Method:** `PUT`
- **Path:** `/notification-channels/{id}`

### Delete Notification Channel

Delete a notification channel.

- **Method:** `DELETE`
- **Path:** `/notification-channels/{id}`

---

## Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid API key |
| `FORBIDDEN` | API key does not have permission |
| `NOT_FOUND` | Requested resource not found |
| `VALIDATION_ERROR` | Invalid request parameters |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## Rate Limits

- Default: 1000 requests per hour per API key
- Burst: 100 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Total allowed requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Support

For API support or questions, contact your system administrator or refer to the in-app documentation.
