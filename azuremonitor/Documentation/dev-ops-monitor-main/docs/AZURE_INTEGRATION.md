# Azure Environment Integration

## Overview

This document describes the comprehensive Azure integration that allows environments to connect to Azure tenants/resource groups for:

- **Resource Discovery** - Automatic discovery and caching of Azure resources
- **Cost Management** - Daily billing and cost data synchronization
- **Performance Metrics** - CPU, memory, DTU, storage metrics collection
- **SQL Insights** - Query performance analysis for SQL databases
- **Test Connectivity** - Admin feature to validate tenant connections

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Admin Dashboard                                    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Azure Tenants Tab                                                     │   │
│  │  ┌─────────────────┐  ┌────────────────────────────────────────────┐ │   │
│  │  │ Tenant List     │  │ Add/Edit Tenant Form                       │ │   │
│  │  │ - Contoso Prod  │  │                                            │ │   │
│  │  │ - Contoso Dev   │  │ [Save]  [Test Connection]  [Test Fetch]   │ │   │
│  │  └─────────────────┘  └────────────────────────────────────────────┘ │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │ Test Results Panel (when Test Fetch clicked)                    │ │   │
│  │  │ - Resource Groups list                                          │ │   │
│  │  │ - Sample Resources table (50 items)                             │ │   │
│  │  │ - Total count                                                   │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Azure Sync Tab                                                        │   │
│  │  - Cron job configuration                                            │   │
│  │  - Sync history log                                                  │   │
│  │  - Manual sync buttons                                               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Database                                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │azure_tenants  │  │azure_resources│  │azure_cost_data│  │azure_metrics │  │
│  │               │  │               │  │               │  │              │  │
│  └───────┬───────┘  └───────────────┘  └───────────────┘  └──────────────┘  │
│          │          ┌───────────────┐  ┌───────────────┐                    │
│          │          │azure_sql_     │  │azure_sync_    │                    │
│          │          │insights       │  │logs           │                    │
│          │          └───────────────┘  └───────────────┘                    │
│          │                                                                   │
│          │  ┌───────────────────────────────────────────────────────────┐   │
│          │  │ environments (with azure_tenant_id, azure_resource_group) │   │
│          │  └───────────────────────────────────────────────────────────┘   │
│          │                                                                   │
│  ┌───────┴───────────────────────────────────────────────────────────────┐  │
│  │ cron.job                                                               │  │
│  │  - azure-sync-resources (every 6 hours)                               │  │
│  │  - azure-sync-costs (daily 6 AM)                                      │  │
│  │  - azure-sync-metrics (every hour)                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Edge Functions                                       │
│                                                                              │
│  ┌──────────────── API Functions ────────────────┐                          │
│  │ azure-auth       - Token acquisition          │                          │
│  │ azure-resources  - List/Sync/Details/TEST     │ ◄── Test Fetch calls    │
│  │ azure-costs      - Sync/Summary/Trends        │                          │
│  │ azure-metrics    - Sync/Query                 │                          │
│  │ azure-sql-insights - Query analysis           │                          │
│  └───────────────────────────────────────────────┘                          │
│                                                                              │
│  ┌──────────────── Cron Handlers ────────────────┐                          │
│  │ azure-sync-resources  (every 6 hours)         │                          │
│  │ azure-sync-costs      (daily 6 AM)            │                          │
│  │ azure-sync-metrics    (every hour)            │                          │
│  └───────────────────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Azure REST APIs                                      │
│  • Azure AD OAuth (token)                                                    │
│  • Resource Manager API (resources, resource groups)                         │
│  • Cost Management API (billing)                                             │
│  • Azure Monitor API (metrics)                                               │
│  • SQL Query Store API (query insights)                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema

### 1.1 New Tables

#### `azure_tenants` - Admin-level Azure connections

Stores Azure App Registration credentials for connecting to Azure subscriptions.

```sql
CREATE TABLE public.azure_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                              -- Display name: "Production Tenant"
  tenant_id TEXT NOT NULL,                         -- Azure AD Tenant ID
  azure_client_id TEXT NOT NULL,                   -- App Registration Client ID  
  subscription_id TEXT NOT NULL,                   -- Azure Subscription ID
  client_secret_id UUID,                           -- Reference to encrypted secret in vault
  is_enabled BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.azure_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage azure tenants"
  ON public.azure_tenants FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can view azure tenants"
  ON public.azure_tenants FOR SELECT
  USING (has_any_role(auth.uid()));
```

#### `azure_resources` - Cached Azure resource data

Caches discovered Azure resources for quick access without API calls.

```sql
CREATE TABLE public.azure_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID REFERENCES environments(id) ON DELETE CASCADE,
  azure_resource_id TEXT NOT NULL UNIQUE,          -- Full Azure resource ID
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL,                     -- e.g., "Microsoft.Sql/servers"
  resource_group TEXT NOT NULL,
  location TEXT,
  tags JSONB,
  properties JSONB,
  sku JSONB,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_azure_resources_environment ON public.azure_resources(environment_id);
CREATE INDEX idx_azure_resources_type ON public.azure_resources(resource_type);
CREATE INDEX idx_azure_resources_azure_id ON public.azure_resources(azure_resource_id);

-- RLS Policies
ALTER TABLE public.azure_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view azure resources"
  ON public.azure_resources FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can manage azure resources"
  ON public.azure_resources FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
```

#### `azure_cost_data` - Daily cost snapshots

Stores daily cost data retrieved from Azure Cost Management API.

```sql
CREATE TABLE public.azure_cost_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_id UUID REFERENCES environments(id) ON DELETE CASCADE,
  azure_resource_id TEXT,                          -- NULL for environment-level costs
  period_date DATE NOT NULL,
  cost_usd DECIMAL(12,4),
  currency TEXT DEFAULT 'USD',
  usage_quantity DECIMAL(18,6),
  meter_category TEXT,                             -- e.g., "Virtual Machines"
  meter_subcategory TEXT,                          -- e.g., "Dv3 Series"
  meter_name TEXT,                                 -- e.g., "D4 v3"
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(environment_id, azure_resource_id, period_date, meter_name)
);

-- Indexes for reporting queries
CREATE INDEX idx_azure_cost_environment_date ON public.azure_cost_data(environment_id, period_date);
CREATE INDEX idx_azure_cost_resource ON public.azure_cost_data(azure_resource_id);

-- RLS Policies
ALTER TABLE public.azure_cost_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view cost data"
  ON public.azure_cost_data FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "Admins and editors can manage cost data"
  ON public.azure_cost_data FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
```

#### `azure_metrics` - Resource performance metrics

Stores time-series performance metrics from Azure Monitor.

```sql
CREATE TABLE public.azure_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_resource_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,                       -- e.g., "Percentage CPU"
  metric_value DECIMAL(18,6),
  unit TEXT,                                       -- e.g., "Percent", "Bytes"
  timestamp TIMESTAMPTZ NOT NULL,
  aggregation_type TEXT,                           -- e.g., "Average", "Maximum"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for time-series queries
CREATE INDEX idx_azure_metrics_resource_time ON public.azure_metrics(azure_resource_id, timestamp DESC);
CREATE INDEX idx_azure_metrics_name ON public.azure_metrics(metric_name);

-- RLS Policies
ALTER TABLE public.azure_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view metrics"
  ON public.azure_metrics FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "System can insert metrics"
  ON public.azure_metrics FOR INSERT
  WITH CHECK (has_any_role(auth.uid()));
```

#### `azure_sql_insights` - SQL-specific query data

Stores query performance data from SQL Database Query Store.

```sql
CREATE TABLE public.azure_sql_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azure_resource_id TEXT NOT NULL,
  query_hash TEXT,
  query_text TEXT,
  execution_count BIGINT,
  total_cpu_time_ms DECIMAL(18,2),
  avg_cpu_time_ms DECIMAL(18,2),
  total_duration_ms DECIMAL(18,2),
  avg_duration_ms DECIMAL(18,2),
  total_logical_reads BIGINT,
  last_execution_time TIMESTAMPTZ,
  captured_at TIMESTAMPTZ DEFAULT now()
);

-- Index for query analysis
CREATE INDEX idx_azure_sql_insights_resource ON public.azure_sql_insights(azure_resource_id);
CREATE INDEX idx_azure_sql_insights_cpu ON public.azure_sql_insights(avg_cpu_time_ms DESC);

-- RLS Policies
ALTER TABLE public.azure_sql_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view SQL insights"
  ON public.azure_sql_insights FOR SELECT
  USING (has_any_role(auth.uid()));

CREATE POLICY "System can manage SQL insights"
  ON public.azure_sql_insights FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));
```

#### `azure_sync_logs` - Track sync job history

Logs all sync job executions for monitoring and debugging.

```sql
CREATE TABLE public.azure_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,                         -- 'resources', 'costs', 'metrics', 'sql_insights'
  environment_id UUID REFERENCES environments(id),
  azure_tenant_id UUID REFERENCES azure_tenants(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,                            -- 'running', 'success', 'failed'
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for recent logs
CREATE INDEX idx_azure_sync_logs_type_time ON public.azure_sync_logs(sync_type, started_at DESC);
CREATE INDEX idx_azure_sync_logs_status ON public.azure_sync_logs(status);

-- RLS Policies
ALTER TABLE public.azure_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON public.azure_sync_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert sync logs"
  ON public.azure_sync_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update sync logs"
  ON public.azure_sync_logs FOR UPDATE
  USING (true);
```

### 1.2 Modify `environments` Table

Add Azure connection fields to existing environments table.

```sql
ALTER TABLE public.environments 
  ADD COLUMN azure_tenant_id UUID REFERENCES azure_tenants(id),
  ADD COLUMN azure_resource_group TEXT,
  ADD COLUMN azure_tag_filter JSONB;

-- Add comment for documentation
COMMENT ON COLUMN environments.azure_tenant_id IS 'Reference to Azure tenant for this environment';
COMMENT ON COLUMN environments.azure_resource_group IS 'Azure resource group to filter resources';
COMMENT ON COLUMN environments.azure_tag_filter IS 'JSON object with tag key-value pairs to filter resources';
```

---

## Phase 2: Edge Functions

### 2.1 `azure-auth` - Token Acquisition Helper

Centralized OAuth token acquisition for all Azure API calls.

**File:** `supabase/functions/azure-auth/index.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | POST | Acquire access token for a tenant |

**Request Body:**
```typescript
{
  tenantId: string;       // Azure AD tenant ID
  clientId: string;       // App registration client ID
  clientSecret: string;   // App registration client secret
}
```

**Response:**
```typescript
{
  accessToken: string;
  expiresIn: number;      // Seconds until expiration
  tokenType: "Bearer";
}
```

**Azure OAuth Endpoint:**
```
POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token

Body (form-urlencoded):
- grant_type: client_credentials
- client_id: {clientId}
- client_secret: {clientSecret}
- scope: https://management.azure.com/.default
```

---

### 2.2 `azure-resources` - Resource Discovery & Sync

Discovers and caches Azure resources for environments.

**File:** `supabase/functions/azure-resources/index.ts`

| Action | Method | Description |
|--------|--------|-------------|
| `list` | GET | List resources from cache |
| `sync` | POST | Sync resources from Azure to cache |
| `details` | GET | Get detailed resource properties |
| `test` | POST | **Test connection and fetch resources (admin)** |

#### Test Action (Admin Feature)

Used by admins to validate tenant configuration and preview available resources.

**Request:**
```typescript
POST /azure-resources?action=test

{
  tenantId: string;
  azureClientId: string;
  clientSecret: string;    // Plain text (for testing before saving)
  subscriptionId: string;
  resourceGroup?: string;  // Optional filter
}
```

**Response:**
```typescript
{
  success: boolean;
  resourceCount: number;
  resourceGroups: string[];           // Available resource groups
  resources: Array<{                  // Sample resources (first 50)
    name: string;
    type: string;
    resourceGroup: string;
    location: string;
    tags: Record<string, string>;
  }>;
  error?: string;
}
```

#### Sync Action

**Request:**
```typescript
POST /azure-resources?action=sync

{
  environmentId: string;
}
```

**Azure APIs Used:**
```
# List all resources in subscription
GET https://management.azure.com/subscriptions/{subscriptionId}/resources?api-version=2021-04-01

# List resources in specific resource group
GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/resources?api-version=2021-04-01

# Get detailed resource info
GET https://management.azure.com/{resourceId}?api-version={resource-specific-version}
```

---

### 2.3 `azure-costs` - Cost Management Data

Fetches and caches billing/cost data from Azure Cost Management.

**File:** `supabase/functions/azure-costs/index.ts`

| Action | Method | Description |
|--------|--------|-------------|
| `sync` | POST | Sync cost data from Azure |
| `summary` | GET | Get cost summary for environment |
| `by-resource` | GET | Cost breakdown by resource |
| `by-type` | GET | Cost breakdown by resource type |
| `trend` | GET | Daily cost trend data |

#### Sync Action

**Request:**
```typescript
POST /azure-costs?action=sync

{
  environmentId: string;
  startDate?: string;      // ISO date, defaults to 30 days ago
  endDate?: string;        // ISO date, defaults to today
}
```

**Azure API:**
```
POST https://management.azure.com/{scope}/providers/Microsoft.CostManagement/query?api-version=2023-03-01

Body:
{
  "type": "ActualCost",
  "timeframe": "Custom",
  "timePeriod": {
    "from": "2025-01-01",
    "to": "2025-01-12"
  },
  "dataset": {
    "granularity": "Daily",
    "aggregation": {
      "totalCost": {
        "name": "Cost",
        "function": "Sum"
      }
    },
    "grouping": [
      { "type": "Dimension", "name": "ResourceId" },
      { "type": "Dimension", "name": "MeterCategory" }
    ]
  }
}
```

#### Summary Response
```typescript
{
  totalCost: number;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  byCategory: Array<{
    category: string;
    cost: number;
  }>;
}
```

---

### 2.4 `azure-metrics` - Resource Performance Metrics

Fetches CPU, memory, DTU, storage metrics from Azure Monitor.

**File:** `supabase/functions/azure-metrics/index.ts`

| Action | Method | Description |
|--------|--------|-------------|
| `sync` | POST | Sync all resource metrics |
| `resource` | GET | Get metrics for specific resource |
| `environment` | GET | Aggregated environment metrics |

#### Sync Action

**Request:**
```typescript
POST /azure-metrics?action=sync

{
  environmentId: string;
  timespan?: string;       // ISO 8601 duration, e.g., "PT1H" for last hour
}
```

**Azure API:**
```
GET https://management.azure.com/{resourceUri}/providers/Microsoft.Insights/metrics?api-version=2023-10-01
  &metricnames={metricNames}
  &aggregation=Average,Maximum
  &interval=PT1H
  &timespan={start}/{end}
```

#### Common Metrics by Resource Type

| Resource Type | Metrics |
|--------------|---------|
| Virtual Machines | `Percentage CPU`, `Available Memory Bytes`, `Disk Read Bytes`, `Disk Write Bytes` |
| SQL Database | `dtu_consumption_percent`, `storage_percent`, `cpu_percent`, `sessions_percent` |
| App Service | `CpuPercentage`, `MemoryPercentage`, `Requests`, `AverageResponseTime` |
| Storage Account | `UsedCapacity`, `Transactions`, `Egress`, `Ingress` |
| Redis Cache | `cacheHits`, `cacheMisses`, `usedmemory`, `connectedclients` |

---

### 2.5 `azure-sql-insights` - SQL Server Query Analysis

Gets query performance data from SQL Database Query Store.

**File:** `supabase/functions/azure-sql-insights/index.ts`

| Action | Method | Description |
|--------|--------|-------------|
| `sync` | POST | Sync query insights for SQL resources |
| `top-queries` | GET | Top queries by CPU |
| `long-running` | GET | Queries with high duration |
| `recommendations` | GET | Azure Advisor suggestions |

#### Top Queries Response
```typescript
{
  queries: Array<{
    queryHash: string;
    queryText: string;
    executionCount: number;
    avgCpuTimeMs: number;
    avgDurationMs: number;
    totalLogicalReads: number;
    lastExecutionTime: string;
  }>;
}
```

**Azure APIs:**
```
# Get top queries
GET https://management.azure.com/{resourceId}/topQueries?api-version=2014-04-01

# Get query text
GET https://management.azure.com/{resourceId}/queryTexts?api-version=2014-04-01

# Get recommendations
GET https://management.azure.com/{resourceId}/advisors/recommendations?api-version=2020-01-01
```

---

### 2.6 `azure-sync-resources` - Cron Job Handler

Background job to sync all Azure resources on schedule.

**File:** `supabase/functions/azure-sync-resources/index.ts`

**Triggered by:** pg_cron every 6 hours

**Logic:**
1. Query all environments with `azure_tenant_id` set
2. For each environment:
   a. Get tenant credentials
   b. Acquire OAuth token
   c. Fetch resources from Azure
   d. Upsert to `azure_resources` table
   e. Log result to `azure_sync_logs`
3. Handle errors gracefully, continue to next environment

---

### 2.7 `azure-sync-costs` - Cron Job Handler

Background job to sync cost data on schedule.

**File:** `supabase/functions/azure-sync-costs/index.ts`

**Triggered by:** pg_cron daily at 6 AM UTC

**Logic:**
1. Query all environments with `azure_tenant_id` set
2. For each environment:
   a. Sync previous day's cost data
   b. Upsert to `azure_cost_data` table
   c. Log result to `azure_sync_logs`
3. Handle pagination for large datasets

---

### 2.8 `azure-sync-metrics` - Cron Job Handler

Background job to sync performance metrics on schedule.

**File:** `supabase/functions/azure-sync-metrics/index.ts`

**Triggered by:** pg_cron every hour

**Logic:**
1. Query all environments with `azure_tenant_id` set
2. For each environment:
   a. Get resources from `azure_resources`
   b. Fetch last hour's metrics from Azure Monitor
   c. Insert to `azure_metrics` table
   d. Log result to `azure_sync_logs`

---

## Phase 3: Cron Jobs

### 3.1 Cron Job Definitions

| Job Name | Schedule | Edge Function | Description |
|----------|----------|---------------|-------------|
| `azure-sync-resources` | `0 */6 * * *` | `azure-sync-resources` | Every 6 hours |
| `azure-sync-costs` | `0 6 * * *` | `azure-sync-costs` | Daily at 6 AM UTC |
| `azure-sync-metrics` | `0 * * * *` | `azure-sync-metrics` | Every hour |

### 3.2 Cron Job SQL

```sql
-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Azure Resource Sync - Every 6 hours
SELECT cron.schedule(
  'azure-sync-resources',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/azure-sync-resources',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Azure Cost Sync - Daily at 6 AM UTC
SELECT cron.schedule(
  'azure-sync-costs',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/azure-sync-costs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Azure Metrics Sync - Every hour
SELECT cron.schedule(
  'azure-sync-metrics',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/azure-sync-metrics',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### 3.3 Cron Job Management Functions

```sql
-- Get all Azure sync cron jobs
CREATE OR REPLACE FUNCTION get_azure_sync_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  jobname text,
  schedule text,
  active boolean,
  nodename text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jobid, jobname, schedule, active, nodename
  FROM cron.job
  WHERE jobname LIKE 'azure-sync-%';
$$;

-- Update Azure sync cron job
CREATE OR REPLACE FUNCTION update_azure_sync_cron_job(
  p_job_name TEXT, 
  p_schedule TEXT, 
  p_is_active BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE cron.job
  SET schedule = p_schedule, active = p_is_active
  WHERE jobname = p_job_name;
END;
$$;
```

---

## Phase 4: Admin UI Components

### 4.1 Component Overview

| Component | Location | Purpose |
|-----------|----------|---------|
| `AzureTenantSettings.tsx` | `src/components/admin/` | Main tab container |
| `AzureTenantList.tsx` | `src/components/admin/` | Table of configured tenants |
| `AzureTenantForm.tsx` | `src/components/admin/` | Add/edit tenant dialog |
| `AzureTenantTestResults.tsx` | `src/components/admin/` | Test fetch results panel |
| `AzureSyncSchedulerSettings.tsx` | `src/components/admin/` | Cron job configuration |
| `AzureSyncLogList.tsx` | `src/components/admin/` | Sync history table |

### 4.2 Azure Tenant Form

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Display Name | Text | Yes | Friendly name for the tenant |
| Tenant ID | Text | Yes | Azure AD Tenant ID (GUID) |
| Application (Client) ID | Text | Yes | App Registration Client ID |
| Client Secret | Password | Yes | App Registration Client Secret |
| Subscription ID | Text | Yes | Azure Subscription ID |
| Is Enabled | Toggle | No | Enable/disable the connection |

**Action Buttons:**

- **Save Settings** - Save tenant configuration (secrets encrypted in vault)
- **Test Connection** - Validates credentials against Azure OAuth endpoint
- **Test Fetch Resources** - Fetches actual resources and displays preview

### 4.3 Test Fetch Resources UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Test Results                                              ✓ Success │
├─────────────────────────────────────────────────────────────────┤
│ Connection Status: ✓ Connected                                  │
│ Subscription: Production-Sub (xxxx-xxxx-xxxx)                   │
│ Total Resources Found: 127                                      │
│ Resource Groups: 8                                              │
├─────────────────────────────────────────────────────────────────┤
│ Resource Groups:                                                │
│   □ rg-production (42 resources)                               │
│   □ rg-staging (28 resources)                                  │
│   □ rg-development (35 resources)                              │
│   ... (show all)                                                │
├─────────────────────────────────────────────────────────────────┤
│ Sample Resources (showing 50 of 127):                           │
│ ┌──────────────────┬─────────────────────┬──────────┬─────────┐ │
│ │ Name             │ Type                │ RG       │ Location│ │
│ ├──────────────────┼─────────────────────┼──────────┼─────────┤ │
│ │ sql-prod-01      │ Microsoft.Sql/      │ rg-prod  │ eastus  │ │
│ │                  │ servers             │          │         │ │
│ │ app-api-prod     │ Microsoft.Web/      │ rg-prod  │ eastus  │ │
│ │                  │ sites               │          │         │ │
│ │ storage-main     │ Microsoft.Storage/  │ rg-prod  │ eastus  │ │
│ │                  │ storageAccounts     │          │         │ │
│ └──────────────────┴─────────────────────┴──────────┴─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Azure Sync Scheduler

**Features:**
- View all Azure sync cron jobs with schedules
- Enable/disable individual sync jobs
- Adjust schedules (dropdown: hourly, every 6 hours, every 12 hours, daily)
- View sync history from `azure_sync_logs`
- Manual "Sync Now" buttons for each sync type

---

## Phase 5: Environment UI Updates

### 5.1 Environment Form Updates

Modify `EnvironmentForm.tsx` to add:

| Field | Type | Description |
|-------|------|-------------|
| Azure Tenant | Dropdown | Select from configured `azure_tenants` |
| Resource Group | Dropdown | Dynamically fetched from Azure |
| Tag Filter | JSON Editor | Optional tag key-value pairs |

### 5.2 Environment Detail Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `EnvironmentAzureOverview.tsx` | `src/components/environments/` | Summary cards |
| `EnvironmentAzureResources.tsx` | `src/components/environments/` | Resource list table |
| `EnvironmentCostOverview.tsx` | `src/components/environments/` | Cost summary cards |
| `CostTrendChart.tsx` | `src/components/environments/` | Daily cost line chart |
| `CostByResourceChart.tsx` | `src/components/environments/` | Cost breakdown charts |
| `ResourceMetricsPanel.tsx` | `src/components/environments/` | Resource metrics display |

---

## Phase 6: Resource-Specific Insights

### 6.1 SQL Server/Database Components

| Component | Purpose |
|-----------|---------|
| `SqlQueryInsights.tsx` | Top queries table with details |
| `LongRunningQueries.tsx` | Queries exceeding duration threshold |
| `SqlPerformanceMetrics.tsx` | DTU, CPU, storage charts |
| `SqlRecommendations.tsx` | Azure Advisor suggestions |

### 6.2 Future Resource Types

| Resource Type | Planned Metrics |
|--------------|-----------------|
| App Service | CPU %, Memory %, Requests, Response Time |
| Virtual Machine | CPU %, Memory, Disk I/O, Network |
| Storage Account | Used Capacity, Transactions, Egress |
| Redis Cache | Cache Hits/Misses, Memory Usage |

---

## Phase 7: Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useAzureTenants` | `src/hooks/useAzureTenants.ts` | CRUD for azure_tenants |
| `useAzureResources` | `src/hooks/useAzureResources.ts` | Fetch/sync Azure resources |
| `useAzureCosts` | `src/hooks/useAzureCosts.ts` | Cost data queries |
| `useAzureMetrics` | `src/hooks/useAzureMetrics.ts` | Metrics queries |
| `useAzureSqlInsights` | `src/hooks/useAzureSqlInsights.ts` | SQL query insights |
| `useAzureSyncLogs` | `src/hooks/useAzureSyncLogs.ts` | Sync job history |
| `useTestAzureTenant` | `src/hooks/useTestAzureTenant.ts` | Test tenant connection |

---

## Azure App Registration Setup

### Required Permissions

The Azure App Registration needs these **Application** (not Delegated) permissions:

| Permission | Role | Scope | Purpose |
|------------|------|-------|---------|
| Reader | `Microsoft.Authorization/*/read` | Subscription | List resources |
| Cost Management Reader | `Microsoft.CostManagement/*/read` | Subscription | Query cost data |
| Monitoring Reader | `Microsoft.Insights/*/read` | Subscription | Read metrics |
| SQL DB Contributor | `Microsoft.Sql/*/read` | SQL resources | Query insights |

### Step-by-Step Setup

1. **Create App Registration**
   - Go to Azure Portal → Azure Active Directory → App registrations
   - Click "New registration"
   - Name: "Quartz Monitoring Integration"
   - Supported account types: "Accounts in this organizational directory only"
   - Click "Register"

2. **Note Application Details**
   - Copy "Application (client) ID"
   - Copy "Directory (tenant) ID"

3. **Create Client Secret**
   - Go to "Certificates & secrets"
   - Click "New client secret"
   - Description: "Quartz Integration"
   - Expiry: 24 months (recommended)
   - Click "Add"
   - **Copy the secret value immediately** (only shown once)

4. **Assign Roles to Subscription**
   - Go to Subscriptions → Select subscription
   - Go to "Access control (IAM)"
   - Click "Add role assignment"
   - Add each required role:
     - Reader
     - Cost Management Reader
     - Monitoring Reader

5. **Assign SQL-Specific Permissions** (if using SQL insights)
   - Go to SQL Server resource
   - Go to "Access control (IAM)"
   - Add "SQL DB Contributor" role

6. **Configure in Quartz**
   - Go to Admin → Azure Tenants
   - Click "Add Azure Tenant"
   - Enter the collected values
   - Click "Test Connection" to validate
   - Click "Test Fetch Resources" to verify resource access

---

## Security Considerations

### Secrets Storage

- Client secrets are stored encrypted in Supabase Vault
- Secrets are never exposed in API responses
- Edge functions retrieve secrets using `get_decrypted_setting`

### RLS Policies

- All Azure tables have Row Level Security enabled
- Only admins can create/modify tenant configurations
- Team members can view resources, costs, and metrics
- Service role has full access for edge function operations

### Edge Function Authentication

- All edge functions require valid JWT (except cron handlers)
- Cron handlers validate service role key
- CORS headers configured for web app access

### Data Retention

Consider implementing retention policies:
- `azure_metrics`: Keep 30 days of hourly data
- `azure_cost_data`: Keep 12 months of daily data
- `azure_sync_logs`: Keep 90 days of logs
- `azure_sql_insights`: Keep 7 days of query data

---

## Files Summary

### Database Migration
- `supabase/migrations/YYYYMMDD_azure_integration.sql`

### Edge Functions
| File | Purpose |
|------|---------|
| `supabase/functions/azure-auth/index.ts` | Token acquisition |
| `supabase/functions/azure-resources/index.ts` | Resource discovery |
| `supabase/functions/azure-costs/index.ts` | Cost management |
| `supabase/functions/azure-metrics/index.ts` | Performance metrics |
| `supabase/functions/azure-sql-insights/index.ts` | SQL query analysis |
| `supabase/functions/azure-sync-resources/index.ts` | Cron: resource sync |
| `supabase/functions/azure-sync-costs/index.ts` | Cron: cost sync |
| `supabase/functions/azure-sync-metrics/index.ts` | Cron: metrics sync |

### Config
- `supabase/config.toml` - Add 8 new function entries

### Admin Components
| File | Purpose |
|------|---------|
| `src/components/admin/AzureTenantSettings.tsx` | Main settings tab |
| `src/components/admin/AzureTenantList.tsx` | Tenant list table |
| `src/components/admin/AzureTenantForm.tsx` | Add/edit form |
| `src/components/admin/AzureTenantTestResults.tsx` | Test results panel |
| `src/components/admin/AzureSyncSchedulerSettings.tsx` | Sync scheduler |
| `src/components/admin/AzureSyncLogList.tsx` | Sync history |

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/useAzureTenants.ts` | Tenant CRUD |
| `src/hooks/useAzureResources.ts` | Resource queries |
| `src/hooks/useAzureCosts.ts` | Cost queries |
| `src/hooks/useAzureMetrics.ts` | Metrics queries |
| `src/hooks/useAzureSqlInsights.ts` | SQL insights |
| `src/hooks/useAzureSyncLogs.ts` | Sync logs |
| `src/hooks/useTestAzureTenant.ts` | Test connection |

### Environment Components
| File | Purpose |
|------|---------|
| `src/components/environments/EnvironmentAzureOverview.tsx` | Azure summary |
| `src/components/environments/EnvironmentAzureResources.tsx` | Resource list |
| `src/components/environments/EnvironmentCostOverview.tsx` | Cost summary |
| `src/components/environments/CostTrendChart.tsx` | Cost trend |
| `src/components/environments/CostByResourceChart.tsx` | Cost breakdown |
| `src/components/environments/ResourceMetricsPanel.tsx` | Metrics display |

### SQL Insight Components
| File | Purpose |
|------|---------|
| `src/components/insights/SqlQueryInsights.tsx` | Top queries |
| `src/components/insights/LongRunningQueries.tsx` | Slow queries |
| `src/components/insights/SqlPerformanceMetrics.tsx` | SQL metrics |
| `src/components/insights/SqlRecommendations.tsx` | Recommendations |

### Page Updates
- `src/pages/Admin.tsx` - Add "Azure Tenants" and "Azure Sync" tabs
- `src/components/clients/EnvironmentForm.tsx` - Add Azure fields

---

## Implementation Order

1. **Phase 1:** Database schema migration
2. **Phase 2a:** `azure-auth` edge function
3. **Phase 2b:** `azure-resources` edge function (with test action)
4. **Phase 4a:** Admin UI - Azure Tenants tab with test feature
5. **Phase 2c-e:** Remaining API edge functions
6. **Phase 3:** Cron jobs setup
7. **Phase 4b:** Sync scheduler UI
8. **Phase 5:** Environment UI updates
9. **Phase 6:** Resource-specific insights
