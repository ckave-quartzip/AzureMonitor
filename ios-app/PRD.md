# Quartz Azure Monitor - iOS Application PRD

**Version:** 1.0.0
**Last Updated:** January 2026
**Project Codename:** QuartzMobile

---

## Executive Summary

This document defines the requirements for building a native iOS application that provides feature parity with the Quartz IP Dev Ops Monitoring System web application. The app will enable DevOps teams to monitor infrastructure health, track Azure costs, manage alerts and incidents, and view resource metrics from their iOS devices.

---

## Product Overview

### Vision
Deliver a best-in-class native iOS monitoring experience that empowers DevOps teams to stay informed and respond to infrastructure issues anytime, anywhere.

### Goals
1. **Feature Parity**: Match all core functionality of the web application
2. **Native Experience**: Leverage iOS-specific capabilities (Push notifications, widgets, haptics)
3. **Offline Support**: Enable viewing of cached data when offline
4. **Performance**: Sub-second navigation and real-time data updates

### Target Users
- DevOps Engineers
- System Administrators
- IT Operations Managers
- Development Team Leads
- On-call Engineers

---

## Technical Architecture

### Platform Requirements
- **Minimum iOS Version:** iOS 17.0
- **Supported Devices:** iPhone, iPad (Universal app)
- **Development Language:** Swift 6.0
- **UI Framework:** SwiftUI
- **Architecture Pattern:** MVVM with Repository pattern
- **Dependency Injection:** Swift Package: Factory or manual DI

### Backend Integration
- **API Base URL:** `https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1`
- **Authentication:** API Key via `X-API-Key` header + Supabase Auth for user sessions
- **Real-time:** Supabase Realtime via WebSocket subscriptions
- **Data Format:** JSON

### Key Dependencies
```swift
// Package.swift dependencies
.package(url: "https://github.com/supabase-community/supabase-swift", from: "2.0.0"),
.package(url: "https://github.com/kishikawakatsumi/KeychainAccess", from: "4.2.0"),
.package(url: "https://github.com/danielgindi/Charts", from: "5.0.0"),
```

---

## Feature Specifications

### 1. Authentication Module

#### 1.1 Login Screen
**Priority:** P0 (Critical)

**Requirements:**
- Email/password authentication via Supabase Auth
- Microsoft/Azure SSO via Supabase OAuth provider
- Biometric authentication (Face ID/Touch ID) for returning users
- Secure credential storage in iOS Keychain
- "Remember Me" functionality
- Password visibility toggle
- Loading states during authentication

**API Endpoints:**
- `POST /auth/login` - Email/password login
- `POST /auth/oauth` - OAuth initiation
- `POST /auth/refresh` - Token refresh

**Acceptance Criteria:**
- [ ] User can sign in with email/password
- [ ] User can sign in with Microsoft SSO
- [ ] Biometric unlock works for returning users
- [ ] Invalid credentials show appropriate error messages
- [ ] Session persists across app restarts

#### 1.2 Session Management
**Priority:** P0 (Critical)

**Requirements:**
- Automatic token refresh before expiration
- Secure session storage
- Logout clears all cached data
- Handle 401 responses globally with automatic re-auth attempt

---

### 2. Dashboard Module

#### 2.1 Main Dashboard
**Priority:** P0 (Critical)

**Requirements:**
- Overview statistics cards showing:
  - Total resources count
  - Resources up/down/degraded
  - Active alerts (critical/warning counts)
  - Average uptime percentage
- Resource health pie chart
- Performance trend line chart (response time + uptime over time)
- Recent check results list
- Critical Azure alerts banner
- Pull-to-refresh functionality
- Real-time updates via WebSocket

**API Endpoints:**
- `GET /dashboard/summary` - Dashboard statistics
- `GET /resources?status=down` - Down resources
- `GET /alerts?status=active` - Active alerts

**Data Models:**
```swift
struct DashboardSummary: Codable {
    let resources: ResourceStats
    let alerts: AlertStats
    let uptime: UptimeStats
}

struct ResourceStats: Codable {
    let total: Int
    let up: Int
    let down: Int
    let degraded: Int
}

struct AlertStats: Codable {
    let active: Int
    let critical: Int
    let warning: Int
}

struct UptimeStats: Codable {
    let average: Double
    let period: String
}
```

**UI Components:**
- `DashboardView` - Main container
- `StatisticsCardsView` - Overview stat cards
- `ResourceHealthChart` - Pie chart component
- `PerformanceTrendChart` - Line chart component
- `RecentChecksListView` - Check results table
- `CriticalAlertsBar` - Alert banner

**Acceptance Criteria:**
- [ ] Dashboard loads within 2 seconds
- [ ] All statistics update in real-time
- [ ] Pull-to-refresh works correctly
- [ ] Charts render with proper animations
- [ ] Tapping cards navigates to relevant detail views

---

### 3. Client Management Module

#### 3.1 Clients List
**Priority:** P1 (High)

**Requirements:**
- Searchable list of all clients
- Filter by status (active/inactive)
- Display client name, status indicator, contact email
- Sort by name or creation date
- Empty state for no results
- Pagination support

**API Endpoints:**
- `GET /clients` - List all clients
- `GET /clients?status=active` - Filtered list

**Data Models:**
```swift
struct Client: Codable, Identifiable {
    let id: UUID
    let name: String
    let status: ClientStatus
    let contactEmail: String?
    let description: String?
    let monthlyHostingFee: Decimal?
    let createdAt: Date
}

enum ClientStatus: String, Codable {
    case active, inactive
}
```

#### 3.2 Client Detail
**Priority:** P1 (High)

**Requirements:**
- Client information header (name, status, contact)
- Billing information section
- Collapsible environment list with nested resources
- Environment health status indicators
- Navigation to environment/resource details

**API Endpoints:**
- `GET /clients/{id}` - Client details
- `GET /clients/{id}/environments` - Client environments

#### 3.3 Client Management (Admin/Editor)
**Priority:** P2 (Medium)

**Requirements:**
- Create new client form
- Edit existing client
- Delete client with confirmation
- Form validation
- Role-based access control

**API Endpoints:**
- `POST /clients` - Create client
- `PUT /clients/{id}` - Update client
- `DELETE /clients/{id}` - Delete client

---

### 4. Resource Monitoring Module

#### 4.1 Resources List
**Priority:** P0 (Critical)

**Requirements:**
- Searchable, filterable table of all resources
- Filters: status, resource type, client, environment
- Status indicator (up/down/degraded/unknown)
- Last check time display
- Response time display
- Pagination with infinite scroll

**API Endpoints:**
- `GET /resources` - All resources
- `GET /resources?status=down&resource_type=api` - Filtered

**Data Models:**
```swift
struct Resource: Codable, Identifiable {
    let id: UUID
    let name: String
    let resourceType: ResourceType
    let status: ResourceStatus
    let lastCheckedAt: Date?
    let clientId: UUID?
    let environmentId: UUID?
    let url: String?
    let description: String?
}

enum ResourceType: String, Codable, CaseIterable {
    case website, server, database, api, storage, network
}

enum ResourceStatus: String, Codable {
    case up, down, degraded, unknown
}
```

#### 4.2 Resource Detail
**Priority:** P0 (Critical)

**Requirements:**
- Resource status hero banner with large status indicator
- Resource metadata (type, URL, description)
- Response time chart (24h, 7d, 30d toggles)
- Uptime statistics (24h, 7d, 30d, 90d)
- Recent check results table
- Azure resource panel (if linked)
- Cost trend chart (if Azure linked)
- Monitoring checks configuration list
- Run check on-demand button

**API Endpoints:**
- `GET /resources/{id}` - Resource details
- `GET /resources/{id}/status` - Current status with metrics
- `GET /resources/{id}/uptime?period=30d` - Uptime stats
- `GET /monitoring-checks?resource_id={id}` - Check configurations
- `GET /monitoring-checks/{id}/results` - Check history

**UI Components:**
- `ResourceDetailView` - Main container
- `ResourceStatusHero` - Large status banner
- `ResponseTimeChart` - Line chart
- `UptimeStatsGrid` - Uptime percentages
- `CheckResultsList` - Recent checks table
- `AzureResourcePanel` - Azure details section

#### 4.3 Resource Management (Admin/Editor)
**Priority:** P2 (Medium)

**Requirements:**
- Create new resource form
- Edit existing resource
- Delete resource with confirmation
- Configure monitoring checks
- Link/unlink Azure resources

---

### 5. Alerts Module

#### 5.1 Alerts List
**Priority:** P0 (Critical)

**Requirements:**
- Tabbed interface: Triggered Alerts, Alert Rules, Cost Alerts
- Triggered alerts sorted by severity then time
- Severity indicators (critical=red, warning=orange, info=blue)
- Alert status badges (active, acknowledged, resolved)
- Swipe actions: Acknowledge, Resolve
- Filter by severity, status, resource

**API Endpoints:**
- `GET /alerts` - All alerts
- `GET /alerts?severity=critical&status=active` - Filtered
- `POST /alerts/{id}/acknowledge` - Acknowledge
- `POST /alerts/{id}/resolve` - Resolve

**Data Models:**
```swift
struct Alert: Codable, Identifiable {
    let id: UUID
    let title: String
    let message: String
    let severity: AlertSeverity
    let status: AlertStatus
    let resourceId: UUID?
    let triggeredAt: Date
    let acknowledgedAt: Date?
    let resolvedAt: Date?
}

enum AlertSeverity: String, Codable {
    case critical, warning, info
}

enum AlertStatus: String, Codable {
    case active, acknowledged, resolved
}
```

#### 5.2 Alert Rules
**Priority:** P1 (High)

**Requirements:**
- List all configured alert rules
- Rule enabled/disabled toggle
- Display rule conditions and thresholds
- Navigate to rule detail/edit

**API Endpoints:**
- `GET /alert-rules` - All rules
- `GET /alert-rules/{id}` - Rule details

#### 5.3 Alert Rule Configuration (Admin/Editor)
**Priority:** P2 (Medium)

**Requirements:**
- Create/edit alert rule form
- Rule type selection
- Threshold configuration
- Resource/type targeting
- Notification channel selection
- Quiet hours configuration

**API Endpoints:**
- `POST /alert-rules` - Create rule
- `PUT /alert-rules/{id}` - Update rule
- `DELETE /alert-rules/{id}` - Delete rule

---

### 6. Incidents Module

#### 6.1 Incidents List
**Priority:** P1 (High)

**Requirements:**
- List of all incidents
- Status indicators (open, investigating, resolved)
- Severity badges
- Filter by status, severity
- Sort by creation date

**API Endpoints:**
- `GET /incidents` - All incidents
- `GET /incidents?status=open` - Filtered

**Data Models:**
```swift
struct Incident: Codable, Identifiable {
    let id: UUID
    let title: String
    let description: String?
    let severity: AlertSeverity
    let status: IncidentStatus
    let createdAt: Date
    let resolvedAt: Date?
    let resolutionNotes: String?
}

enum IncidentStatus: String, Codable {
    case open, investigating, resolved
}
```

#### 6.2 Incident Detail
**Priority:** P1 (High)

**Requirements:**
- Incident information header
- Status timeline
- Linked alerts list
- Resolution notes section
- Update status actions

**API Endpoints:**
- `GET /incidents/{id}` - Incident details

#### 6.3 Incident Management (Admin/Editor)
**Priority:** P2 (Medium)

**Requirements:**
- Create incident form
- Update incident status
- Add resolution notes
- Link/unlink alerts

---

### 7. Azure Overview Module

#### 7.1 Azure Dashboard
**Priority:** P1 (High)

**Requirements:**
- Multi-tenant overview cards
- Total cost summary (current period)
- Cost trend chart
- Resource count by type
- Health issues summary
- Tenant selector dropdown

**API Endpoints:**
- `GET /azure/tenants` - All tenants
- `GET /azure/costs/summary` - Cost summary
- `GET /azure/costs/trend?days=30` - Cost trend

**Data Models:**
```swift
struct AzureTenant: Codable, Identifiable {
    let id: UUID
    let name: String
    let tenantId: String
    let subscriptionId: String
    let isEnabled: Bool
}

struct AzureCostSummary: Codable {
    let totalCost: Decimal
    let currency: String
    let period: DatePeriod
    let byTenant: [TenantCost]
}

struct TenantCost: Codable {
    let tenantId: UUID
    let tenantName: String
    let cost: Decimal
}
```

#### 7.2 Azure Health Issues
**Priority:** P1 (High)

**Requirements:**
- Health recommendations list
- Idle resources identification
- Rightsizing suggestions
- Cost anomaly detection
- Filter by issue type

**API Endpoints:**
- `GET /azure/resources` - Azure resources
- Azure health/recommendations (via edge functions)

#### 7.3 Azure Cost Report
**Priority:** P1 (High)

**Requirements:**
- Date range picker
- Tenant filter
- Resource group filter
- Period comparison summary cards
- Cost trend chart
- Cost breakdown tables (by resource, group, category)
- Spike day analysis
- Export to CSV (share sheet)

**API Endpoints:**
- `GET /azure/costs/summary?from=X&to=Y`
- `GET /azure/costs/by-resource-group`
- `GET /azure/costs/trend`

**UI Components:**
- `CostReportView` - Main container
- `CostFiltersView` - Filter controls
- `CostComparisonCards` - Period comparison
- `CostTrendChart` - Line chart
- `CostBreakdownTables` - Grouped tables
- `CostSpikeAnalysis` - Spike drill-down

#### 7.4 Azure Resource Detail
**Priority:** P2 (Medium)

**Requirements:**
- Azure resource metadata
- Performance metrics charts
- Cost history chart
- Link to internal resource (if linked)

---

### 8. SQL Monitoring Module

#### 8.1 SQL Overview Dashboard
**Priority:** P2 (Medium)

**Requirements:**
- SQL health score widget
- Database list with status
- Key metrics summary (CPU, DTU, storage)
- Replication status

**API Endpoints:**
- Custom edge functions for SQL insights

#### 8.2 SQL Query Insights
**Priority:** P2 (Medium)

**Requirements:**
- Top queries by CPU time
- Long-running queries list
- Query details view
- Wait statistics
- Missing indexes recommendations

---

### 9. Settings & Admin Module

#### 9.1 User Settings
**Priority:** P1 (High)

**Requirements:**
- Profile information display
- Change password
- Notification preferences
- Theme selection (light/dark/system)
- Biometric settings toggle
- Sign out

#### 9.2 Admin Settings (Admin Role Only)
**Priority:** P2 (Medium)

**Requirements:**
- User management list
- Azure tenant configuration
- System settings
- API key management
- Sync scheduler settings
- Sync logs viewer

---

### 10. Push Notifications

**Priority:** P0 (Critical)

**Requirements:**
- Register device for push notifications
- Notification categories:
  - Critical alerts (immediate)
  - Warning alerts
  - Incident updates
  - Resource status changes
  - Cost anomalies
- Deep linking to relevant screens
- Notification preferences by category
- Badge count for unread alerts

**Implementation:**
- APNs integration via Supabase edge function
- Notification Service Extension for rich notifications
- Background app refresh for data sync

---

### 11. Widgets (iOS Widgets)

**Priority:** P3 (Nice to Have)

**Requirements:**
- Small widget: Overall status (up/down counts)
- Medium widget: Top 3 critical alerts
- Large widget: Dashboard summary
- Lock screen widget: Alert count
- Widget configuration for specific clients/resources

---

### 12. Offline Support

**Priority:** P2 (Medium)

**Requirements:**
- Cache dashboard data locally
- Cache recent check results
- Cache alert list
- Show stale data indicator when offline
- Queue actions (acknowledge/resolve) for sync when online
- Core Data or SwiftData for persistence

---

## Data Models Summary

### Core Entities
| Entity | Properties |
|--------|------------|
| Client | id, name, status, contactEmail, description, monthlyHostingFee |
| Environment | id, clientId, name, description, azureTenantId, azureResourceGroup |
| Resource | id, name, resourceType, status, url, clientId, environmentId |
| MonitoringCheck | id, resourceId, checkType, url, interval, timeout, isEnabled |
| CheckResult | id, checkId, status, responseTime, statusCode, checkedAt |
| Alert | id, title, message, severity, status, resourceId, triggeredAt |
| AlertRule | id, name, ruleType, threshold, isEnabled |
| Incident | id, title, description, severity, status, createdAt |
| AzureTenant | id, name, tenantId, subscriptionId, isEnabled |
| AzureResource | id, azureResourceId, name, type, resourceGroup, location |
| AzureCostData | id, resourceId, periodDate, cost, currency |

---

## API Integration Layer

### Network Layer Structure
```
Sources/
├── Networking/
│   ├── APIClient.swift           # Base HTTP client
│   ├── APIEndpoint.swift         # Endpoint definitions
│   ├── APIError.swift            # Error types
│   ├── AuthInterceptor.swift     # Auth header injection
│   └── ResponseHandler.swift     # Response parsing
├── Repositories/
│   ├── ClientRepository.swift
│   ├── ResourceRepository.swift
│   ├── AlertRepository.swift
│   ├── IncidentRepository.swift
│   └── AzureRepository.swift
└── Services/
    ├── AuthService.swift
    ├── RealtimeService.swift
    └── PushNotificationService.swift
```

### API Response Wrapper
```swift
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: APIErrorResponse?
    let meta: ResponseMeta?
}

struct ResponseMeta: Codable {
    let timestamp: Date
    let requestId: String
    let total: Int?
    let limit: Int?
    let offset: Int?
}

struct APIErrorResponse: Codable {
    let code: String
    let message: String
}
```

---

## Navigation Structure

```
TabView
├── Dashboard (Tab 1)
│   └── DashboardView
│       ├── → ResourceDetailView
│       └── → AlertDetailView
├── Resources (Tab 2)
│   └── ResourcesListView
│       └── → ResourceDetailView
│           ├── → CheckResultsView
│           └── → AzureResourceDetailView
├── Alerts (Tab 3)
│   └── AlertsTabView
│       ├── TriggeredAlertsView
│       │   └── → AlertDetailView
│       ├── AlertRulesView
│       │   └── → AlertRuleDetailView
│       └── CostAlertsView
├── Clients (Tab 4)
│   └── ClientsListView
│       └── → ClientDetailView
│           └── → EnvironmentDetailView
│               └── → ResourceDetailView
└── More (Tab 5)
    └── MoreMenuView
        ├── → AzureOverviewView
        │   ├── → AzureHealthIssuesView
        │   ├── → AzureCostReportView
        │   └── → AzureResourceDetailView
        ├── → IncidentsListView
        │   └── → IncidentDetailView
        ├── → SQLMonitoringView
        ├── → SettingsView
        └── → AdminView (Admin only)
```

---

## Non-Functional Requirements

### Performance
- App launch to interactive: < 2 seconds
- API response handling: < 500ms
- Navigation transitions: 60 FPS
- Memory usage: < 150MB typical

### Security
- All data in transit via HTTPS/TLS 1.3
- API keys stored in iOS Keychain
- Biometric authentication for sensitive actions
- No sensitive data in logs
- Certificate pinning (optional, P3)

### Accessibility
- VoiceOver support for all screens
- Dynamic Type support
- Minimum touch target: 44x44 points
- Color contrast ratios meet WCAG 2.1 AA
- Reduce Motion support

### Localization
- Initial release: English only
- Prepare for localization (NSLocalizedString)
- RTL layout support ready

---

## Testing Requirements

### Unit Tests
- Repository layer: 80% coverage
- ViewModel layer: 80% coverage
- Utility functions: 90% coverage

### UI Tests
- Critical user flows automated
- Login flow
- Dashboard navigation
- Alert acknowledgment flow

### Integration Tests
- API integration tests
- Offline mode tests

---

## Release Phases

### Phase 1: MVP (Weeks 1-4)
- Authentication (email/password, SSO)
- Dashboard with real-time updates
- Resource list and detail
- Alerts list with acknowledge/resolve
- Push notifications (critical alerts)

### Phase 2: Core Features (Weeks 5-8)
- Client management
- Incident management
- Azure overview and cost reports
- Alert rule management
- Biometric authentication

### Phase 3: Advanced Features (Weeks 9-12)
- SQL monitoring
- Admin settings
- Widgets
- Offline support
- Full notification preferences

---

## Success Metrics

| Metric | Target |
|--------|--------|
| App Store Rating | > 4.5 |
| Crash-free Users | > 99.5% |
| Average Session Duration | > 3 minutes |
| Daily Active Users | > 60% of web users |
| Alert Response Time (via app) | < 2 minutes |

---

## Appendix A: Screen Inventory

| Screen | View Name | Priority |
|--------|-----------|----------|
| Login | LoginView | P0 |
| Dashboard | DashboardView | P0 |
| Resources List | ResourcesListView | P0 |
| Resource Detail | ResourceDetailView | P0 |
| Alerts List | AlertsListView | P0 |
| Alert Detail | AlertDetailView | P0 |
| Clients List | ClientsListView | P1 |
| Client Detail | ClientDetailView | P1 |
| Incidents List | IncidentsListView | P1 |
| Incident Detail | IncidentDetailView | P1 |
| Azure Overview | AzureOverviewView | P1 |
| Azure Cost Report | AzureCostReportView | P1 |
| Azure Health Issues | AzureHealthIssuesView | P1 |
| Azure Resource Detail | AzureResourceDetailView | P2 |
| Alert Rules List | AlertRulesListView | P1 |
| Alert Rule Detail | AlertRuleDetailView | P2 |
| SQL Overview | SQLOverviewView | P2 |
| SQL Query Detail | SQLQueryDetailView | P2 |
| Settings | SettingsView | P1 |
| Admin | AdminView | P2 |
| User Management | UserManagementView | P2 |

---

## Appendix B: API Endpoint Reference

See `/Documentation/API_DOCUMENTATION.md` for complete API reference.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2026 | Claude | Initial PRD |
