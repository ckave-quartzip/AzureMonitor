# MASTER BUILD PROMPT - Quartz Azure Monitor iOS App

You are building a complete native iOS application called **azuremonitor** that provides feature parity with the Quartz Azure Monitor web application. Build the entire app in one continuous session.

---

## PROJECT SPECIFICATIONS

**App Name:** azuremonitor
**Bundle ID:** com.quartz.monitor
**Platform:** iOS 17.0+
**Language:** Swift 6.0
**UI Framework:** SwiftUI
**Architecture:** MVVM with Repository pattern

---

## PROJECT LOCATION

**IMPORTANT:** Use the existing Xcode project. Do NOT create a new project.

- **Project Root:** `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/`
- **Source Files:** `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor/`
- **Xcode Project:** `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor.xcodeproj`

All new Swift files should be created inside: `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor/`

---

## API CONFIGURATION

```
Base URL: https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1
Auth Header: X-API-Key
Supabase URL: https://zkqhktsvhazeljnncncr.supabase.co
OAuth Callback: quartzmonitor://auth-callback
```

---

## SWIFT PACKAGE DEPENDENCIES

```swift
// Package.swift or Xcode SPM
dependencies: [
    .package(url: "https://github.com/supabase-community/supabase-swift", from: "2.0.0"),
    .package(url: "https://github.com/kishikawakatsumi/KeychainAccess", from: "4.2.0")
]
```

---

## COMPLETE PROJECT STRUCTURE

Create folders and files inside the existing project at `/Users/chriskave/Documents/Development/AzureMonitor/azuremonitor/azuremonitor/`:

```
azuremonitor/azuremonitor/
├── azuremonitorApp.swift (existing - will be updated)
├── ContentView.swift (existing - will be replaced)
├── Core/
│   ├── Design/
│   │   ├── Colors.swift
│   │   ├── Typography.swift
│   │   └── Spacing.swift
│   ├── Extensions/
│   │   ├── Date+Extensions.swift
│   │   └── View+Extensions.swift
│   └── Utilities/
│       └── Haptics.swift
├── Services/
│   ├── Networking/
│   │   ├── APIClient.swift
│   │   ├── APIEndpoint.swift
│   │   ├── APIError.swift
│   │   └── APIResponse.swift
│   ├── Auth/
│   │   ├── AuthService.swift
│   │   ├── KeychainService.swift
│   │   └── BiometricService.swift
│   └── Realtime/
│       └── RealtimeService.swift
├── Repositories/
│   ├── DashboardRepository.swift
│   ├── ClientRepository.swift
│   ├── ResourceRepository.swift
│   ├── AlertRepository.swift
│   ├── IncidentRepository.swift
│   └── AzureRepository.swift
├── Models/
│   ├── Client.swift
│   ├── Environment.swift
│   ├── Resource.swift
│   ├── Alert.swift
│   ├── AlertRule.swift
│   ├── Incident.swift
│   ├── MonitoringCheck.swift
│   ├── CheckResult.swift
│   ├── DashboardSummary.swift
│   ├── AzureTenant.swift
│   ├── AzureResource.swift
│   ├── AzureCostData.swift
│   └── User.swift
├── ViewModels/
│   ├── Auth/
│   │   └── LoginViewModel.swift
│   ├── Dashboard/
│   │   └── DashboardViewModel.swift
│   ├── Resources/
│   │   ├── ResourcesListViewModel.swift
│   │   └── ResourceDetailViewModel.swift
│   ├── Alerts/
│   │   ├── AlertsListViewModel.swift
│   │   └── AlertDetailViewModel.swift
│   ├── Clients/
│   │   ├── ClientsListViewModel.swift
│   │   └── ClientDetailViewModel.swift
│   ├── Incidents/
│   │   ├── IncidentsListViewModel.swift
│   │   └── IncidentDetailViewModel.swift
│   ├── Azure/
│   │   ├── AzureOverviewViewModel.swift
│   │   └── AzureCostReportViewModel.swift
│   └── Settings/
│       └── SettingsViewModel.swift
├── Views/
│   ├── Auth/
│   │   └── LoginView.swift
│   ├── Dashboard/
│   │   ├── DashboardView.swift
│   │   ├── StatisticsCardsView.swift
│   │   ├── ResourceHealthChart.swift
│   │   ├── PerformanceTrendChart.swift
│   │   └── RecentChecksListView.swift
│   ├── Resources/
│   │   ├── ResourcesListView.swift
│   │   ├── ResourceDetailView.swift
│   │   ├── ResourceRow.swift
│   │   ├── ResourceStatusHero.swift
│   │   └── ResponseTimeChart.swift
│   ├── Alerts/
│   │   ├── AlertsListView.swift
│   │   ├── AlertDetailView.swift
│   │   ├── AlertRow.swift
│   │   └── AlertRulesListView.swift
│   ├── Clients/
│   │   ├── ClientsListView.swift
│   │   ├── ClientDetailView.swift
│   │   └── ClientRow.swift
│   ├── Incidents/
│   │   ├── IncidentsListView.swift
│   │   ├── IncidentDetailView.swift
│   │   └── IncidentRow.swift
│   ├── Azure/
│   │   ├── AzureOverviewView.swift
│   │   ├── AzureCostReportView.swift
│   │   ├── AzureHealthIssuesView.swift
│   │   └── CostTrendChart.swift
│   ├── Settings/
│   │   └── SettingsView.swift
│   └── More/
│       └── MoreMenuView.swift
├── Components/
│   ├── Common/
│   │   ├── StatusIndicator.swift
│   │   ├── SeverityBadge.swift
│   │   ├── StatusBadge.swift
│   │   ├── StatCard.swift
│   │   ├── SearchBar.swift
│   │   ├── FilterChip.swift
│   │   ├── EmptyStateView.swift
│   │   ├── LoadingView.swift
│   │   └── ErrorView.swift
│   ├── Forms/
│   │   ├── QuartzTextField.swift
│   │   ├── PrimaryButton.swift
│   │   └── SecondaryButton.swift
│   └── Charts/
│       ├── LineChartView.swift
│       └── PieChartView.swift
└── Navigation/
    ├── MainTabView.swift
    └── DeepLinkHandler.swift
```

NOTE: The old structure reference below is deprecated, use the structure above:

```
DEPRECATED - QuartzMobile/
├── App/
│   ├── (old reference)
│   │
│   ├── Core/
│   │   ├── Design/
│   │   │   ├── Colors.swift
│   │   │   ├── Typography.swift
│   │   │   └── Spacing.swift
│   │   ├── Extensions/
│   │   │   ├── Date+Extensions.swift
│   │   │   └── View+Extensions.swift
│   │   └── Utilities/
│   │       └── Haptics.swift
│   │
│   ├── Services/
│   │   ├── Networking/
│   │   │   ├── APIClient.swift
│   │   │   ├── APIEndpoint.swift
│   │   │   ├── APIError.swift
│   │   │   └── APIResponse.swift
│   │   ├── Auth/
│   │   │   ├── AuthService.swift
│   │   │   ├── KeychainService.swift
│   │   │   └── BiometricService.swift
│   │   └── Realtime/
│   │       └── RealtimeService.swift
│   │
│   ├── Repositories/
│   │   ├── DashboardRepository.swift
│   │   ├── ClientRepository.swift
│   │   ├── ResourceRepository.swift
│   │   ├── AlertRepository.swift
│   │   ├── IncidentRepository.swift
│   │   └── AzureRepository.swift
│   │
│   ├── Models/
│   │   ├── Client.swift
│   │   ├── Environment.swift
│   │   ├── Resource.swift
│   │   ├── Alert.swift
│   │   ├── AlertRule.swift
│   │   ├── Incident.swift
│   │   ├── MonitoringCheck.swift
│   │   ├── CheckResult.swift
│   │   ├── DashboardSummary.swift
│   │   ├── AzureTenant.swift
│   │   ├── AzureResource.swift
│   │   ├── AzureCostData.swift
│   │   └── User.swift
│   │
│   ├── ViewModels/
│   │   ├── Auth/
│   │   │   └── LoginViewModel.swift
│   │   ├── Dashboard/
│   │   │   └── DashboardViewModel.swift
│   │   ├── Resources/
│   │   │   ├── ResourcesListViewModel.swift
│   │   │   └── ResourceDetailViewModel.swift
│   │   ├── Alerts/
│   │   │   ├── AlertsListViewModel.swift
│   │   │   └── AlertDetailViewModel.swift
│   │   ├── Clients/
│   │   │   ├── ClientsListViewModel.swift
│   │   │   └── ClientDetailViewModel.swift
│   │   ├── Incidents/
│   │   │   ├── IncidentsListViewModel.swift
│   │   │   └── IncidentDetailViewModel.swift
│   │   ├── Azure/
│   │   │   ├── AzureOverviewViewModel.swift
│   │   │   └── AzureCostReportViewModel.swift
│   │   └── Settings/
│   │       └── SettingsViewModel.swift
│   │
│   ├── Views/
│   │   ├── Auth/
│   │   │   └── LoginView.swift
│   │   ├── Dashboard/
│   │   │   ├── DashboardView.swift
│   │   │   ├── StatisticsCardsView.swift
│   │   │   ├── ResourceHealthChart.swift
│   │   │   ├── PerformanceTrendChart.swift
│   │   │   └── RecentChecksListView.swift
│   │   ├── Resources/
│   │   │   ├── ResourcesListView.swift
│   │   │   ├── ResourceDetailView.swift
│   │   │   ├── ResourceRow.swift
│   │   │   ├── ResourceStatusHero.swift
│   │   │   └── ResponseTimeChart.swift
│   │   ├── Alerts/
│   │   │   ├── AlertsListView.swift
│   │   │   ├── AlertDetailView.swift
│   │   │   ├── AlertRow.swift
│   │   │   └── AlertRulesListView.swift
│   │   ├── Clients/
│   │   │   ├── ClientsListView.swift
│   │   │   ├── ClientDetailView.swift
│   │   │   └── ClientRow.swift
│   │   ├── Incidents/
│   │   │   ├── IncidentsListView.swift
│   │   │   ├── IncidentDetailView.swift
│   │   │   └── IncidentRow.swift
│   │   ├── Azure/
│   │   │   ├── AzureOverviewView.swift
│   │   │   ├── AzureCostReportView.swift
│   │   │   ├── AzureHealthIssuesView.swift
│   │   │   └── CostTrendChart.swift
│   │   ├── Settings/
│   │   │   └── SettingsView.swift
│   │   └── More/
│   │       └── MoreMenuView.swift
│   │
│   ├── Components/
│   │   ├── Common/
│   │   │   ├── StatusIndicator.swift
│   │   │   ├── SeverityBadge.swift
│   │   │   ├── StatusBadge.swift
│   │   │   ├── StatCard.swift
│   │   │   ├── SearchBar.swift
│   │   │   ├── FilterChip.swift
│   │   │   ├── EmptyStateView.swift
│   │   │   ├── LoadingView.swift
│   │   │   └── ErrorView.swift
│   │   ├── Forms/
│   │   │   ├── QuartzTextField.swift
│   │   │   ├── PrimaryButton.swift
│   │   │   └── SecondaryButton.swift
│   │   └── Charts/
│   │       ├── LineChartView.swift
│   │       └── PieChartView.swift
│   │
│   ├── Navigation/
│   │   ├── MainTabView.swift
│   │   └── DeepLinkHandler.swift
│   │
│   └── Resources/
│       ├── Assets.xcassets/
│       └── Info.plist
│
└── QuartzMobileTests/
    ├── ViewModelTests/
    └── RepositoryTests/
```

---

## PHASE 1: CORE DESIGN SYSTEM

### 1.1 Colors.swift

```swift
import SwiftUI

extension Color {
    // Status Colors
    static let statusUp = Color(red: 34/255, green: 197/255, blue: 94/255)
    static let statusDown = Color(red: 239/255, green: 68/255, blue: 68/255)
    static let statusDegraded = Color(red: 245/255, green: 158/255, blue: 11/255)
    static let statusUnknown = Color(red: 107/255, green: 114/255, blue: 128/255)

    // Severity Colors
    static let severityCritical = Color(red: 220/255, green: 38/255, blue: 38/255)
    static let severityWarning = Color(red: 249/255, green: 115/255, blue: 22/255)
    static let severityInfo = Color(red: 59/255, green: 130/255, blue: 246/255)

    // Brand Colors
    static let brandPrimary = Color(red: 99/255, green: 102/255, blue: 241/255)
    static let brandSecondary = Color(red: 139/255, green: 92/255, blue: 246/255)

    // Background Colors
    static let backgroundPrimary = Color(uiColor: .systemBackground)
    static let backgroundSecondary = Color(uiColor: .secondarySystemBackground)
    static let backgroundTertiary = Color(uiColor: .tertiarySystemBackground)

    // Text Colors
    static let textPrimary = Color(uiColor: .label)
    static let textSecondary = Color(uiColor: .secondaryLabel)
    static let textTertiary = Color(uiColor: .tertiaryLabel)
}
```

### 1.2 Spacing.swift

```swift
import Foundation

enum Spacing {
    static let xxs: CGFloat = 2
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48
}
```

### 1.3 Typography.swift

```swift
import SwiftUI

extension Font {
    static let displayLarge = Font.system(.largeTitle, design: .default, weight: .bold)
    static let displayMedium = Font.system(.title, design: .default, weight: .semibold)
    static let displaySmall = Font.system(.title2, design: .default, weight: .semibold)
    static let bodyLarge = Font.system(.body, design: .default, weight: .regular)
    static let bodyMedium = Font.system(.callout, design: .default, weight: .regular)
    static let bodySmall = Font.system(.footnote, design: .default, weight: .regular)
    static let labelLarge = Font.system(.subheadline, design: .default, weight: .medium)
    static let labelMedium = Font.system(.caption, design: .default, weight: .medium)
    static let labelSmall = Font.system(.caption2, design: .default, weight: .medium)
    static let monoLarge = Font.system(.body, design: .monospaced, weight: .regular)
    static let monoMedium = Font.system(.footnote, design: .monospaced, weight: .regular)
}
```

---

## PHASE 2: DATA MODELS

### 2.1 All Models

```swift
// MARK: - Client.swift
import Foundation

struct Client: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let status: ClientStatus
    let contactEmail: String?
    let description: String?
    let monthlyHostingFee: Decimal?
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id, name, status, description
        case contactEmail = "contact_email"
        case monthlyHostingFee = "monthly_hosting_fee"
        case createdAt = "created_at"
    }
}

enum ClientStatus: String, Codable {
    case active, inactive
}

// MARK: - Environment.swift
struct Environment: Codable, Identifiable, Hashable {
    let id: UUID
    let clientId: UUID
    let name: String
    let description: String?
    let azureTenantId: UUID?
    let azureResourceGroup: String?

    enum CodingKeys: String, CodingKey {
        case id, name, description
        case clientId = "client_id"
        case azureTenantId = "azure_tenant_id"
        case azureResourceGroup = "azure_resource_group"
    }
}

// MARK: - Resource.swift
struct Resource: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let resourceType: ResourceType
    let status: ResourceStatus
    let lastCheckedAt: Date?
    let clientId: UUID?
    let environmentId: UUID?
    let url: String?
    let description: String?

    enum CodingKeys: String, CodingKey {
        case id, name, status, url, description
        case resourceType = "resource_type"
        case lastCheckedAt = "last_checked_at"
        case clientId = "client_id"
        case environmentId = "environment_id"
    }
}

enum ResourceType: String, Codable, CaseIterable {
    case website, server, database, api, storage, network

    var displayName: String {
        rawValue.capitalized
    }

    var icon: String {
        switch self {
        case .website: return "globe"
        case .server: return "server.rack"
        case .database: return "cylinder"
        case .api: return "arrow.left.arrow.right"
        case .storage: return "externaldrive"
        case .network: return "network"
        }
    }
}

enum ResourceStatus: String, Codable {
    case up, down, degraded, unknown

    var color: Color {
        switch self {
        case .up: return .statusUp
        case .down: return .statusDown
        case .degraded: return .statusDegraded
        case .unknown: return .statusUnknown
        }
    }

    var displayName: String {
        rawValue.uppercased()
    }
}

// MARK: - Alert.swift
struct Alert: Codable, Identifiable, Hashable {
    let id: UUID
    let title: String
    let message: String
    let severity: AlertSeverity
    let status: AlertStatus
    let resourceId: UUID?
    let triggeredAt: Date
    let acknowledgedAt: Date?
    let resolvedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, title, message, severity, status
        case resourceId = "resource_id"
        case triggeredAt = "triggered_at"
        case acknowledgedAt = "acknowledged_at"
        case resolvedAt = "resolved_at"
    }
}

enum AlertSeverity: String, Codable {
    case critical, warning, info

    var color: Color {
        switch self {
        case .critical: return .severityCritical
        case .warning: return .severityWarning
        case .info: return .severityInfo
        }
    }

    var displayName: String {
        rawValue.uppercased()
    }
}

enum AlertStatus: String, Codable {
    case active, acknowledged, resolved
}

// MARK: - Incident.swift
struct Incident: Codable, Identifiable, Hashable {
    let id: UUID
    let title: String
    let description: String?
    let severity: AlertSeverity
    let status: IncidentStatus
    let createdAt: Date
    let resolvedAt: Date?
    let resolutionNotes: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, severity, status
        case createdAt = "created_at"
        case resolvedAt = "resolved_at"
        case resolutionNotes = "resolution_notes"
    }
}

enum IncidentStatus: String, Codable {
    case open, investigating, resolved
}

// MARK: - DashboardSummary.swift
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

// MARK: - CheckResult.swift
struct CheckResult: Codable, Identifiable, Hashable {
    let id: UUID
    let checkId: UUID
    let status: ResourceStatus
    let responseTimeMs: Int?
    let statusCode: Int?
    let checkedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, status
        case checkId = "check_id"
        case responseTimeMs = "response_time_ms"
        case statusCode = "status_code"
        case checkedAt = "checked_at"
    }
}

// MARK: - AzureTenant.swift
struct AzureTenant: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let tenantId: String
    let subscriptionId: String
    let isEnabled: Bool

    enum CodingKeys: String, CodingKey {
        case id, name
        case tenantId = "tenant_id"
        case subscriptionId = "subscription_id"
        case isEnabled = "is_enabled"
    }
}

// MARK: - AzureCostSummary.swift
struct AzureCostSummary: Codable {
    let totalCost: Decimal
    let currency: String
    let period: DatePeriod
    let byTenant: [TenantCost]

    enum CodingKeys: String, CodingKey {
        case currency, period
        case totalCost = "total_cost"
        case byTenant = "by_tenant"
    }
}

struct DatePeriod: Codable {
    let from: String
    let to: String
}

struct TenantCost: Codable, Identifiable {
    let tenantId: UUID
    let tenantName: String
    let cost: Decimal

    var id: UUID { tenantId }

    enum CodingKeys: String, CodingKey {
        case cost
        case tenantId = "tenant_id"
        case tenantName = "tenant_name"
    }
}

// MARK: - User.swift
struct User: Codable, Identifiable {
    let id: UUID
    let email: String
    let roles: [AppRole]
}

enum AppRole: String, Codable {
    case admin, editor, viewer
}
```

---

## PHASE 3: NETWORKING LAYER

### 3.1 APIResponse.swift

```swift
import Foundation

struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: APIErrorResponse?
    let meta: ResponseMeta?
}

struct APIErrorResponse: Codable {
    let code: String
    let message: String
}

struct ResponseMeta: Codable {
    let timestamp: Date?
    let requestId: String?
    let total: Int?
    let limit: Int?
    let offset: Int?

    enum CodingKeys: String, CodingKey {
        case timestamp, total, limit, offset
        case requestId = "request_id"
    }
}

struct EmptyResponse: Codable {}
```

### 3.2 APIError.swift

```swift
import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case forbidden
    case notFound(resource: String)
    case validationError(message: String)
    case rateLimited
    case serverError(message: String)
    case networkError(underlying: Error)
    case decodingError(underlying: Error)
    case invalidResponse
    case noData

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Please sign in to continue"
        case .forbidden:
            return "You don't have permission for this action"
        case .notFound(let resource):
            return "\(resource) not found"
        case .validationError(let message):
            return message
        case .rateLimited:
            return "Too many requests. Please wait."
        case .serverError(let message):
            return message
        case .networkError:
            return "Network error. Check your connection."
        case .decodingError:
            return "Error processing response"
        case .invalidResponse:
            return "Invalid server response"
        case .noData:
            return "No data received"
        }
    }
}
```

### 3.3 APIEndpoint.swift

```swift
import Foundation

enum APIEndpoint {
    // Health
    case health

    // Dashboard
    case dashboardSummary

    // Clients
    case clients(status: String? = nil, limit: Int = 50, offset: Int = 0)
    case client(id: UUID)
    case clientEnvironments(clientId: UUID)

    // Resources
    case resources(status: String? = nil, type: String? = nil, clientId: UUID? = nil, limit: Int = 50, offset: Int = 0)
    case resource(id: UUID)
    case resourceStatus(id: UUID)
    case resourceUptime(id: UUID, period: String = "30d")

    // Monitoring Checks
    case monitoringChecks(resourceId: UUID? = nil)
    case checkResults(checkId: UUID, limit: Int = 100)

    // Alerts
    case alerts(severity: String? = nil, status: String? = nil, limit: Int = 50, offset: Int = 0)
    case alert(id: UUID)
    case acknowledgeAlert(id: UUID)
    case resolveAlert(id: UUID)

    // Alert Rules
    case alertRules
    case alertRule(id: UUID)

    // Incidents
    case incidents(status: String? = nil, severity: String? = nil, limit: Int = 50, offset: Int = 0)
    case incident(id: UUID)

    // Azure
    case azureTenants
    case azureResources(tenantId: UUID? = nil, limit: Int = 50, offset: Int = 0)
    case azureCostSummary(tenantId: UUID? = nil, from: String? = nil, to: String? = nil)
    case azureCostTrend(tenantId: UUID? = nil, days: Int = 30)
    case azureCostByResourceGroup(tenantId: UUID? = nil)
    case azureSyncStatus

    var path: String {
        switch self {
        case .health: return "/health"
        case .dashboardSummary: return "/dashboard/summary"
        case .clients: return "/clients"
        case .client(let id): return "/clients/\(id)"
        case .clientEnvironments(let clientId): return "/clients/\(clientId)/environments"
        case .resources: return "/resources"
        case .resource(let id): return "/resources/\(id)"
        case .resourceStatus(let id): return "/resources/\(id)/status"
        case .resourceUptime(let id, _): return "/resources/\(id)/uptime"
        case .monitoringChecks: return "/monitoring-checks"
        case .checkResults(let checkId, _): return "/monitoring-checks/\(checkId)/results"
        case .alerts: return "/alerts"
        case .alert(let id): return "/alerts/\(id)"
        case .acknowledgeAlert(let id): return "/alerts/\(id)/acknowledge"
        case .resolveAlert(let id): return "/alerts/\(id)/resolve"
        case .alertRules: return "/alert-rules"
        case .alertRule(let id): return "/alert-rules/\(id)"
        case .incidents: return "/incidents"
        case .incident(let id): return "/incidents/\(id)"
        case .azureTenants: return "/azure/tenants"
        case .azureResources: return "/azure/resources"
        case .azureCostSummary: return "/azure/costs/summary"
        case .azureCostTrend: return "/azure/costs/trend"
        case .azureCostByResourceGroup: return "/azure/costs/by-resource-group"
        case .azureSyncStatus: return "/azure/sync/status"
        }
    }

    var method: HTTPMethod {
        switch self {
        case .acknowledgeAlert, .resolveAlert:
            return .post
        default:
            return .get
        }
    }

    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []

        switch self {
        case .clients(let status, let limit, let offset):
            if let status = status { items.append(URLQueryItem(name: "status", value: status)) }
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))
            items.append(URLQueryItem(name: "offset", value: "\(offset)"))

        case .resources(let status, let type, let clientId, let limit, let offset):
            if let status = status { items.append(URLQueryItem(name: "status", value: status)) }
            if let type = type { items.append(URLQueryItem(name: "resource_type", value: type)) }
            if let clientId = clientId { items.append(URLQueryItem(name: "client_id", value: clientId.uuidString)) }
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))
            items.append(URLQueryItem(name: "offset", value: "\(offset)"))

        case .resourceUptime(_, let period):
            items.append(URLQueryItem(name: "period", value: period))

        case .monitoringChecks(let resourceId):
            if let resourceId = resourceId { items.append(URLQueryItem(name: "resource_id", value: resourceId.uuidString)) }

        case .checkResults(_, let limit):
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))

        case .alerts(let severity, let status, let limit, let offset):
            if let severity = severity { items.append(URLQueryItem(name: "severity", value: severity)) }
            if let status = status { items.append(URLQueryItem(name: "status", value: status)) }
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))
            items.append(URLQueryItem(name: "offset", value: "\(offset)"))

        case .incidents(let status, let severity, let limit, let offset):
            if let status = status { items.append(URLQueryItem(name: "status", value: status)) }
            if let severity = severity { items.append(URLQueryItem(name: "severity", value: severity)) }
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))
            items.append(URLQueryItem(name: "offset", value: "\(offset)"))

        case .azureResources(let tenantId, let limit, let offset):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))
            items.append(URLQueryItem(name: "offset", value: "\(offset)"))

        case .azureCostSummary(let tenantId, let from, let to):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            if let from = from { items.append(URLQueryItem(name: "from", value: from)) }
            if let to = to { items.append(URLQueryItem(name: "to", value: to)) }

        case .azureCostTrend(let tenantId, let days):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            items.append(URLQueryItem(name: "days", value: "\(days)"))

        case .azureCostByResourceGroup(let tenantId):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }

        default:
            break
        }

        return items
    }

    func url(baseURL: String) -> URL {
        var components = URLComponents(string: baseURL + path)!
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        return components.url!
    }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
}
```

### 3.4 APIClient.swift

```swift
import Foundation

@MainActor
class APIClient: ObservableObject {
    static let shared = APIClient()

    private let baseURL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
    private let session: URLSession
    private let keychainService = KeychainService()
    private let decoder: JSONDecoder

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            let formatters = [
                ISO8601DateFormatter(),
                { () -> DateFormatter in
                    let f = DateFormatter()
                    f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
                    return f
                }(),
                { () -> DateFormatter in
                    let f = DateFormatter()
                    f.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
                    return f
                }()
            ]

            for formatter in formatters {
                if let formatter = formatter as? ISO8601DateFormatter {
                    if let date = formatter.date(from: dateString) { return date }
                } else if let formatter = formatter as? DateFormatter {
                    if let date = formatter.date(from: dateString) { return date }
                }
            }

            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date")
        }
    }

    func request<T: Codable>(_ endpoint: APIEndpoint) async throws -> T {
        var request = URLRequest(url: endpoint.url(baseURL: baseURL))
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let apiKey = keychainService.getAPIKey() {
            request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200...299:
            break
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound(resource: "Resource")
        case 429:
            throw APIError.rateLimited
        case 500...599:
            throw APIError.serverError(message: "Server error")
        default:
            throw APIError.serverError(message: "Unknown error: \(httpResponse.statusCode)")
        }

        do {
            let apiResponse = try decoder.decode(APIResponse<T>.self, from: data)

            guard apiResponse.success else {
                throw APIError.serverError(message: apiResponse.error?.message ?? "Unknown error")
            }

            guard let responseData = apiResponse.data else {
                throw APIError.noData
            }

            return responseData
        } catch let error as DecodingError {
            throw APIError.decodingError(underlying: error)
        }
    }

    func requestVoid(_ endpoint: APIEndpoint) async throws {
        var request = URLRequest(url: endpoint.url(baseURL: baseURL))
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let apiKey = keychainService.getAPIKey() {
            request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        }

        let (_, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(message: "Request failed: \(httpResponse.statusCode)")
        }
    }
}
```

---

## PHASE 4: AUTHENTICATION SERVICES

### 4.1 KeychainService.swift

```swift
import Foundation
import KeychainAccess

class KeychainService {
    private let keychain = Keychain(service: "com.quartz.monitor")

    private enum Keys {
        static let apiKey = "api_key"
        static let accessToken = "access_token"
        static let refreshToken = "refresh_token"
    }

    func storeAPIKey(_ key: String) {
        try? keychain.set(key, key: Keys.apiKey)
    }

    func getAPIKey() -> String? {
        try? keychain.get(Keys.apiKey)
    }

    func storeTokens(access: String, refresh: String) {
        try? keychain.set(access, key: Keys.accessToken)
        try? keychain.set(refresh, key: Keys.refreshToken)
    }

    func getAccessToken() -> String? {
        try? keychain.get(Keys.accessToken)
    }

    func getRefreshToken() -> String? {
        try? keychain.get(Keys.refreshToken)
    }

    func clearAll() {
        try? keychain.remove(Keys.apiKey)
        try? keychain.remove(Keys.accessToken)
        try? keychain.remove(Keys.refreshToken)
    }
}
```

### 4.2 BiometricService.swift

```swift
import LocalAuthentication

class BiometricService {
    enum BiometricType {
        case none, touchID, faceID
    }

    var biometricType: BiometricType {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .faceID: return .faceID
        case .touchID: return .touchID
        default: return .none
        }
    }

    func authenticate() async -> Bool {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return false
        }

        do {
            return try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Sign in to Quartz Monitor"
            )
        } catch {
            return false
        }
    }
}
```

### 4.3 AuthService.swift

```swift
import Foundation
import Supabase

@MainActor
class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var error: Error?

    private let supabase: SupabaseClient
    private let keychainService = KeychainService()
    private let biometricService = BiometricService()

    init() {
        self.supabase = SupabaseClient(
            supabaseURL: URL(string: "https://zkqhktsvhazeljnncncr.supabase.co")!,
            supabaseKey: "YOUR_SUPABASE_ANON_KEY"
        )

        Task {
            await checkExistingSession()
        }
    }

    private func checkExistingSession() async {
        if let session = supabase.auth.currentSession {
            isAuthenticated = true
            // Fetch user roles if needed
        }
    }

    func signInWithAzure() async throws {
        isLoading = true
        error = nil

        do {
            try await supabase.auth.signInWithOAuth(
                provider: .azure,
                redirectTo: URL(string: "quartzmonitor://auth-callback")
            )
        } catch {
            self.error = error
            throw error
        }

        isLoading = false
    }

    func signIn(email: String, password: String) async throws {
        isLoading = true
        error = nil

        do {
            let response = try await supabase.auth.signIn(email: email, password: password)
            keychainService.storeTokens(
                access: response.accessToken,
                refresh: response.refreshToken
            )
            isAuthenticated = true
        } catch {
            self.error = error
            throw error
        }

        isLoading = false
    }

    func handleOAuthCallback(url: URL) async throws {
        isLoading = true

        do {
            let session = try await supabase.auth.session(from: url)
            keychainService.storeTokens(
                access: session.accessToken,
                refresh: session.refreshToken
            )
            isAuthenticated = true
        } catch {
            self.error = error
            throw error
        }

        isLoading = false
    }

    func signOut() async {
        do {
            try await supabase.auth.signOut()
        } catch {
            // Continue with local cleanup even if remote fails
        }

        keychainService.clearAll()
        isAuthenticated = false
        currentUser = nil
    }

    func authenticateWithBiometrics() async -> Bool {
        guard keychainService.getAccessToken() != nil else {
            return false
        }

        return await biometricService.authenticate()
    }
}
```

---

## PHASE 5: REPOSITORIES

### 5.1 DashboardRepository.swift

```swift
import Foundation

class DashboardRepository {
    private let apiClient = APIClient.shared

    func fetchSummary() async throws -> DashboardSummary {
        try await apiClient.request(.dashboardSummary)
    }
}
```

### 5.2 ResourceRepository.swift

```swift
import Foundation

class ResourceRepository {
    private let apiClient = APIClient.shared

    func fetchResources(status: String? = nil, type: String? = nil, clientId: UUID? = nil, limit: Int = 50, offset: Int = 0) async throws -> [Resource] {
        try await apiClient.request(.resources(status: status, type: type, clientId: clientId, limit: limit, offset: offset))
    }

    func fetchResource(id: UUID) async throws -> Resource {
        try await apiClient.request(.resource(id: id))
    }

    func fetchResourceStatus(id: UUID) async throws -> ResourceStatusResponse {
        try await apiClient.request(.resourceStatus(id: id))
    }

    func fetchResourceUptime(id: UUID, period: String = "30d") async throws -> ResourceUptimeResponse {
        try await apiClient.request(.resourceUptime(id: id, period: period))
    }
}

struct ResourceStatusResponse: Codable {
    let resourceId: UUID
    let currentStatus: ResourceStatus
    let lastCheck: LastCheck?
    let uptime24h: Double?
    let uptime7d: Double?
    let uptime30d: Double?

    enum CodingKeys: String, CodingKey {
        case currentStatus = "current_status"
        case resourceId = "resource_id"
        case lastCheck = "last_check"
        case uptime24h = "uptime_24h"
        case uptime7d = "uptime_7d"
        case uptime30d = "uptime_30d"
    }
}

struct LastCheck: Codable {
    let checkedAt: Date
    let responseTimeMs: Int?
    let statusCode: Int?

    enum CodingKeys: String, CodingKey {
        case checkedAt = "checked_at"
        case responseTimeMs = "response_time_ms"
        case statusCode = "status_code"
    }
}

struct ResourceUptimeResponse: Codable {
    let uptime24h: Double
    let uptime7d: Double
    let uptime30d: Double
    let uptime90d: Double

    enum CodingKeys: String, CodingKey {
        case uptime24h = "uptime_24h"
        case uptime7d = "uptime_7d"
        case uptime30d = "uptime_30d"
        case uptime90d = "uptime_90d"
    }
}
```

### 5.3 AlertRepository.swift

```swift
import Foundation

class AlertRepository {
    private let apiClient = APIClient.shared

    func fetchAlerts(severity: String? = nil, status: String? = nil, limit: Int = 50, offset: Int = 0) async throws -> [Alert] {
        try await apiClient.request(.alerts(severity: severity, status: status, limit: limit, offset: offset))
    }

    func fetchAlert(id: UUID) async throws -> Alert {
        try await apiClient.request(.alert(id: id))
    }

    func acknowledgeAlert(id: UUID) async throws {
        try await apiClient.requestVoid(.acknowledgeAlert(id: id))
    }

    func resolveAlert(id: UUID) async throws {
        try await apiClient.requestVoid(.resolveAlert(id: id))
    }

    func fetchAlertRules() async throws -> [AlertRule] {
        try await apiClient.request(.alertRules)
    }
}

struct AlertRule: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let ruleType: String
    let thresholdValue: Double?
    let comparisonOperator: String?
    let isEnabled: Bool

    enum CodingKeys: String, CodingKey {
        case id, name
        case ruleType = "rule_type"
        case thresholdValue = "threshold_value"
        case comparisonOperator = "comparison_operator"
        case isEnabled = "is_enabled"
    }
}
```

### 5.4 ClientRepository.swift

```swift
import Foundation

class ClientRepository {
    private let apiClient = APIClient.shared

    func fetchClients(status: String? = nil, limit: Int = 50, offset: Int = 0) async throws -> [Client] {
        try await apiClient.request(.clients(status: status, limit: limit, offset: offset))
    }

    func fetchClient(id: UUID) async throws -> Client {
        try await apiClient.request(.client(id: id))
    }

    func fetchClientEnvironments(clientId: UUID) async throws -> [Environment] {
        try await apiClient.request(.clientEnvironments(clientId: clientId))
    }
}
```

### 5.5 IncidentRepository.swift

```swift
import Foundation

class IncidentRepository {
    private let apiClient = APIClient.shared

    func fetchIncidents(status: String? = nil, severity: String? = nil, limit: Int = 50, offset: Int = 0) async throws -> [Incident] {
        try await apiClient.request(.incidents(status: status, severity: severity, limit: limit, offset: offset))
    }

    func fetchIncident(id: UUID) async throws -> Incident {
        try await apiClient.request(.incident(id: id))
    }
}
```

### 5.6 AzureRepository.swift

```swift
import Foundation

class AzureRepository {
    private let apiClient = APIClient.shared

    func fetchTenants() async throws -> [AzureTenant] {
        try await apiClient.request(.azureTenants)
    }

    func fetchCostSummary(tenantId: UUID? = nil, from: String? = nil, to: String? = nil) async throws -> AzureCostSummary {
        try await apiClient.request(.azureCostSummary(tenantId: tenantId, from: from, to: to))
    }

    func fetchCostTrend(tenantId: UUID? = nil, days: Int = 30) async throws -> [DailyCost] {
        try await apiClient.request(.azureCostTrend(tenantId: tenantId, days: days))
    }
}

struct DailyCost: Codable, Identifiable {
    let date: String
    let cost: Decimal

    var id: String { date }
}
```

---

## PHASE 6: COMMON UI COMPONENTS

### 6.1 StatusIndicator.swift

```swift
import SwiftUI

struct StatusIndicator: View {
    enum Size { case small, medium, large }

    let status: ResourceStatus
    let size: Size

    var body: some View {
        Circle()
            .fill(status.color)
            .frame(width: dimension, height: dimension)
            .overlay(
                Circle()
                    .stroke(status.color.opacity(0.3), lineWidth: 2)
            )
    }

    private var dimension: CGFloat {
        switch size {
        case .small: return 8
        case .medium: return 12
        case .large: return 16
        }
    }
}
```

### 6.2 SeverityBadge.swift

```swift
import SwiftUI

struct SeverityBadge: View {
    let severity: AlertSeverity

    var body: some View {
        Text(severity.displayName)
            .font(.labelSmall)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xxs)
            .background(severity.color)
            .clipShape(Capsule())
    }
}
```

### 6.3 StatusBadge.swift

```swift
import SwiftUI

struct StatusBadge: View {
    let status: AlertStatus

    var body: some View {
        Text(status.rawValue.capitalized)
            .font(.labelSmall)
            .foregroundColor(foregroundColor)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xxs)
            .background(backgroundColor)
            .clipShape(Capsule())
    }

    private var foregroundColor: Color {
        switch status {
        case .active: return .white
        case .acknowledged: return .brandPrimary
        case .resolved: return .statusUp
        }
    }

    private var backgroundColor: Color {
        switch status {
        case .active: return .severityCritical
        case .acknowledged: return .brandPrimary.opacity(0.2)
        case .resolved: return .statusUp.opacity(0.2)
        }
    }
}
```

### 6.4 StatCard.swift

```swift
import SwiftUI

struct StatCard: View {
    let title: String
    let value: String
    let subtitle: String?
    let icon: String
    let tint: Color

    init(title: String, value: String, subtitle: String? = nil, icon: String, tint: Color = .brandPrimary) {
        self.title = title
        self.value = value
        self.subtitle = subtitle
        self.icon = icon
        self.tint = tint
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(tint)
                Spacer()
            }

            Text(value)
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(title)
                .font(.labelMedium)
                .foregroundColor(.textSecondary)

            if let subtitle = subtitle {
                Text(subtitle)
                    .font(.labelSmall)
                    .foregroundColor(.textTertiary)
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

### 6.5 SearchBar.swift

```swift
import SwiftUI

struct SearchBar: View {
    @Binding var text: String
    let placeholder: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.textTertiary)

            TextField(placeholder, text: $text)
                .font(.bodyMedium)

            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(Spacing.md)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}
```

### 6.6 FilterChip.swift

```swift
import SwiftUI

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.labelMedium)
                .foregroundColor(isSelected ? .white : .textPrimary)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(isSelected ? Color.brandPrimary : Color.backgroundSecondary)
                .clipShape(Capsule())
        }
    }
}
```

### 6.7 EmptyStateView.swift

```swift
import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var action: (() -> Void)?
    var actionTitle: String?

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.textTertiary)

            Text(title)
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(message)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            if let action = action, let actionTitle = actionTitle {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.labelLarge)
                        .foregroundColor(.white)
                        .padding(.horizontal, Spacing.xl)
                        .padding(.vertical, Spacing.md)
                        .background(Color.brandPrimary)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(Spacing.xxl)
    }
}
```

### 6.8 LoadingView.swift

```swift
import SwiftUI

struct LoadingView: View {
    let message: String?

    init(message: String? = nil) {
        self.message = message
    }

    var body: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle())

            if let message = message {
                Text(message)
                    .font(.labelMedium)
                    .foregroundColor(.textSecondary)
            }
        }
    }
}
```

### 6.9 ErrorView.swift

```swift
import SwiftUI

struct ErrorView: View {
    let error: Error
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.severityWarning)

            Text("Something went wrong")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(error.localizedDescription)
                .font(.bodySmall)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            Button(action: retryAction) {
                Label("Try Again", systemImage: "arrow.clockwise")
                    .font(.labelLarge)
                    .foregroundColor(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, Spacing.md)
                    .background(Color.brandPrimary)
                    .clipShape(Capsule())
            }
        }
        .padding(Spacing.xxl)
    }
}
```

### 6.10 PrimaryButton.swift

```swift
import SwiftUI

struct PrimaryButton: View {
    let title: String
    let action: () -> Void
    var isLoading: Bool = false
    var isDisabled: Bool = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
                Text(title)
                    .font(.labelLarge)
            }
            .frame(maxWidth: .infinity)
            .foregroundColor(.white)
            .padding(.vertical, Spacing.md)
            .background(isDisabled ? Color.textTertiary : Color.brandPrimary)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .disabled(isLoading || isDisabled)
    }
}
```

### 6.11 Haptics.swift

```swift
import UIKit

enum Haptics {
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    static func warning() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }

    static func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }

    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }
}
```

### 6.12 Date+Extensions.swift

```swift
import Foundation

extension Date {
    var timeAgo: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: self, relativeTo: Date())
    }

    var formatted: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
}
```

---

## PHASE 7: VIEWMODELS

### 7.1 LoginViewModel.swift

```swift
import Foundation

@MainActor
class LoginViewModel: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var error: Error?
    @Published var showBiometricOption = false

    private let authService = AuthService.shared
    private let biometricService = BiometricService()

    init() {
        showBiometricOption = biometricService.biometricType != .none
    }

    var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty && email.contains("@")
    }

    func signInWithEmail() async {
        isLoading = true
        error = nil

        do {
            try await authService.signIn(email: email, password: password)
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func signInWithAzure() async {
        isLoading = true
        error = nil

        do {
            try await authService.signInWithAzure()
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func signInWithBiometrics() async {
        let success = await authService.authenticateWithBiometrics()
        if success {
            // Biometric auth succeeded, user is now authenticated
        }
    }
}
```

### 7.2 DashboardViewModel.swift

```swift
import Foundation

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var summary: DashboardSummary?
    @Published var isLoading = false
    @Published var error: Error?

    private let repository = DashboardRepository()

    func loadDashboard() async {
        isLoading = summary == nil
        error = nil

        do {
            summary = try await repository.fetchSummary()
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
```

### 7.3 ResourcesListViewModel.swift

```swift
import Foundation

@MainActor
class ResourcesListViewModel: ObservableObject {
    @Published var resources: [Resource] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var searchText = ""
    @Published var selectedStatus: ResourceStatus?
    @Published var selectedType: ResourceType?

    private let repository = ResourceRepository()

    var filteredResources: [Resource] {
        resources.filter { resource in
            let matchesSearch = searchText.isEmpty ||
                resource.name.localizedCaseInsensitiveContains(searchText)
            let matchesStatus = selectedStatus == nil ||
                resource.status == selectedStatus
            let matchesType = selectedType == nil ||
                resource.resourceType == selectedType
            return matchesSearch && matchesStatus && matchesType
        }
    }

    func loadResources() async {
        isLoading = resources.isEmpty
        error = nil

        do {
            resources = try await repository.fetchResources()
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func clearFilters() {
        selectedStatus = nil
        selectedType = nil
        searchText = ""
    }
}
```

### 7.4 ResourceDetailViewModel.swift

```swift
import Foundation

@MainActor
class ResourceDetailViewModel: ObservableObject {
    @Published var resource: Resource?
    @Published var status: ResourceStatusResponse?
    @Published var uptime: ResourceUptimeResponse?
    @Published var isLoading = false
    @Published var error: Error?

    private let repository = ResourceRepository()
    private let resourceId: UUID

    init(resourceId: UUID) {
        self.resourceId = resourceId
    }

    func loadDetails() async {
        isLoading = true
        error = nil

        do {
            async let resourceTask = repository.fetchResource(id: resourceId)
            async let statusTask = repository.fetchResourceStatus(id: resourceId)
            async let uptimeTask = repository.fetchResourceUptime(id: resourceId)

            let (resource, status, uptime) = try await (resourceTask, statusTask, uptimeTask)

            self.resource = resource
            self.status = status
            self.uptime = uptime
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
```

### 7.5 AlertsListViewModel.swift

```swift
import Foundation

@MainActor
class AlertsListViewModel: ObservableObject {
    @Published var alerts: [Alert] = []
    @Published var alertRules: [AlertRule] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedTab = 0
    @Published var selectedSeverity: AlertSeverity?
    @Published var selectedStatus: AlertStatus?

    private let repository = AlertRepository()

    var filteredAlerts: [Alert] {
        alerts.filter { alert in
            let matchesSeverity = selectedSeverity == nil || alert.severity == selectedSeverity
            let matchesStatus = selectedStatus == nil || alert.status == selectedStatus
            return matchesSeverity && matchesStatus
        }
    }

    var activeAlerts: [Alert] {
        filteredAlerts.filter { $0.status == .active }
    }

    var acknowledgedAlerts: [Alert] {
        filteredAlerts.filter { $0.status == .acknowledged }
    }

    func loadAlerts() async {
        isLoading = alerts.isEmpty
        error = nil

        do {
            alerts = try await repository.fetchAlerts()
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func loadAlertRules() async {
        do {
            alertRules = try await repository.fetchAlertRules()
        } catch {
            self.error = error
        }
    }

    func acknowledgeAlert(_ alert: Alert) async {
        do {
            try await repository.acknowledgeAlert(id: alert.id)
            Haptics.success()
            await loadAlerts()
        } catch {
            self.error = error
            Haptics.error()
        }
    }

    func resolveAlert(_ alert: Alert) async {
        do {
            try await repository.resolveAlert(id: alert.id)
            Haptics.success()
            await loadAlerts()
        } catch {
            self.error = error
            Haptics.error()
        }
    }
}
```

### 7.6 ClientsListViewModel.swift

```swift
import Foundation

@MainActor
class ClientsListViewModel: ObservableObject {
    @Published var clients: [Client] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var searchText = ""
    @Published var selectedStatus: ClientStatus?

    private let repository = ClientRepository()

    var filteredClients: [Client] {
        clients.filter { client in
            let matchesSearch = searchText.isEmpty ||
                client.name.localizedCaseInsensitiveContains(searchText)
            let matchesStatus = selectedStatus == nil ||
                client.status == selectedStatus
            return matchesSearch && matchesStatus
        }
    }

    func loadClients() async {
        isLoading = clients.isEmpty
        error = nil

        do {
            clients = try await repository.fetchClients()
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
```

### 7.7 ClientDetailViewModel.swift

```swift
import Foundation

@MainActor
class ClientDetailViewModel: ObservableObject {
    @Published var client: Client?
    @Published var environments: [Environment] = []
    @Published var isLoading = false
    @Published var error: Error?

    private let repository = ClientRepository()
    private let clientId: UUID

    init(clientId: UUID) {
        self.clientId = clientId
    }

    func loadDetails() async {
        isLoading = true
        error = nil

        do {
            async let clientTask = repository.fetchClient(id: clientId)
            async let environmentsTask = repository.fetchClientEnvironments(clientId: clientId)

            let (client, environments) = try await (clientTask, environmentsTask)

            self.client = client
            self.environments = environments
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
```

### 7.8 IncidentsListViewModel.swift

```swift
import Foundation

@MainActor
class IncidentsListViewModel: ObservableObject {
    @Published var incidents: [Incident] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedStatus: IncidentStatus?

    private let repository = IncidentRepository()

    var filteredIncidents: [Incident] {
        guard let status = selectedStatus else { return incidents }
        return incidents.filter { $0.status == status }
    }

    func loadIncidents() async {
        isLoading = incidents.isEmpty
        error = nil

        do {
            incidents = try await repository.fetchIncidents()
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
```

### 7.9 AzureOverviewViewModel.swift

```swift
import Foundation

@MainActor
class AzureOverviewViewModel: ObservableObject {
    @Published var tenants: [AzureTenant] = []
    @Published var costSummary: AzureCostSummary?
    @Published var costTrend: [DailyCost] = []
    @Published var selectedTenant: AzureTenant?
    @Published var isLoading = false
    @Published var error: Error?

    private let repository = AzureRepository()

    func loadOverview() async {
        isLoading = true
        error = nil

        do {
            tenants = try await repository.fetchTenants()
            costSummary = try await repository.fetchCostSummary(tenantId: selectedTenant?.id)
            costTrend = try await repository.fetchCostTrend(tenantId: selectedTenant?.id)
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func selectTenant(_ tenant: AzureTenant?) async {
        selectedTenant = tenant
        await loadOverview()
    }
}
```

### 7.10 SettingsViewModel.swift

```swift
import Foundation

@MainActor
class SettingsViewModel: ObservableObject {
    @Published var notificationsEnabled = true
    @Published var biometricsEnabled = false
    @Published var selectedTheme: Theme = .system

    private let authService = AuthService.shared
    private let biometricService = BiometricService()

    enum Theme: String, CaseIterable {
        case light, dark, system
    }

    var biometricTypeLabel: String {
        switch biometricService.biometricType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .none: return "Biometrics"
        }
    }

    var canUseBiometrics: Bool {
        biometricService.biometricType != .none
    }

    func signOut() async {
        await authService.signOut()
    }
}
```

---

## PHASE 8: VIEWS

### 8.1 LoginView.swift

```swift
import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @EnvironmentObject var authService: AuthService

    var body: some View {
        NavigationStack {
            VStack(spacing: Spacing.xl) {
                Spacer()

                // Logo
                VStack(spacing: Spacing.md) {
                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.brandPrimary)

                    Text("Quartz Monitor")
                        .font(.displayLarge)
                        .foregroundColor(.textPrimary)

                    Text("Infrastructure Monitoring")
                        .font(.bodyMedium)
                        .foregroundColor(.textSecondary)
                }

                Spacer()

                // Sign in with Microsoft (Primary)
                Button(action: { Task { await viewModel.signInWithAzure() } }) {
                    HStack(spacing: Spacing.md) {
                        Image(systemName: "building.2.fill")
                        Text("Sign in with Microsoft")
                    }
                    .font(.labelLarge)
                    .frame(maxWidth: .infinity)
                    .foregroundColor(.white)
                    .padding(.vertical, Spacing.md)
                    .background(Color.brandPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }

                // Divider
                HStack {
                    Rectangle()
                        .fill(Color.textTertiary.opacity(0.3))
                        .frame(height: 1)
                    Text("or")
                        .font(.labelMedium)
                        .foregroundColor(.textTertiary)
                    Rectangle()
                        .fill(Color.textTertiary.opacity(0.3))
                        .frame(height: 1)
                }

                // Email/Password form
                VStack(spacing: Spacing.md) {
                    TextField("Email", text: $viewModel.email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    SecureField("Password", text: $viewModel.password)
                        .textContentType(.password)
                        .padding(Spacing.md)
                        .background(Color.backgroundSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    PrimaryButton(
                        title: "Sign In",
                        action: { Task { await viewModel.signInWithEmail() } },
                        isLoading: viewModel.isLoading,
                        isDisabled: !viewModel.isFormValid
                    )
                }

                // Biometric option
                if viewModel.showBiometricOption {
                    Button(action: { Task { await viewModel.signInWithBiometrics() } }) {
                        HStack {
                            Image(systemName: "faceid")
                            Text("Sign in with Face ID")
                        }
                        .font(.labelMedium)
                        .foregroundColor(.brandPrimary)
                    }
                }

                Spacer()
            }
            .padding(Spacing.lg)
            .alert("Error", isPresented: .constant(viewModel.error != nil)) {
                Button("OK") { viewModel.error = nil }
            } message: {
                Text(viewModel.error?.localizedDescription ?? "")
            }
        }
    }
}
```

### 8.2 DashboardView.swift

```swift
import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                if viewModel.isLoading {
                    LoadingView(message: "Loading dashboard...")
                        .frame(maxWidth: .infinity, minHeight: 300)
                } else if let error = viewModel.error {
                    ErrorView(error: error, retryAction: { Task { await viewModel.loadDashboard() } })
                } else if let summary = viewModel.summary {
                    VStack(spacing: Spacing.lg) {
                        StatisticsCardsView(summary: summary)
                        ResourceHealthChart(stats: summary.resources)
                        RecentChecksListView()
                    }
                    .padding(Spacing.lg)
                }
            }
            .navigationTitle("Dashboard")
            .refreshable {
                await viewModel.loadDashboard()
            }
            .task {
                await viewModel.loadDashboard()
            }
        }
    }
}

struct StatisticsCardsView: View {
    let summary: DashboardSummary

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.md) {
            StatCard(
                title: "Total Resources",
                value: "\(summary.resources.total)",
                icon: "server.rack",
                tint: .brandPrimary
            )

            StatCard(
                title: "Resources Up",
                value: "\(summary.resources.up)",
                icon: "checkmark.circle.fill",
                tint: .statusUp
            )

            StatCard(
                title: "Resources Down",
                value: "\(summary.resources.down)",
                icon: "xmark.circle.fill",
                tint: .statusDown
            )

            StatCard(
                title: "Active Alerts",
                value: "\(summary.alerts.active)",
                subtitle: "\(summary.alerts.critical) critical",
                icon: "bell.fill",
                tint: .severityWarning
            )

            StatCard(
                title: "Average Uptime",
                value: String(format: "%.1f%%", summary.uptime.average),
                subtitle: summary.uptime.period,
                icon: "chart.line.uptrend.xyaxis",
                tint: .statusUp
            )
        }
    }
}

struct ResourceHealthChart: View {
    let stats: ResourceStats

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Resource Health")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            HStack(spacing: Spacing.xl) {
                // Simple bar representation
                VStack(spacing: Spacing.sm) {
                    HStack(spacing: Spacing.xs) {
                        Rectangle()
                            .fill(Color.statusUp)
                            .frame(width: CGFloat(stats.up) / CGFloat(max(stats.total, 1)) * 150, height: 20)
                        Spacer()
                    }
                    HStack(spacing: Spacing.xs) {
                        Rectangle()
                            .fill(Color.statusDown)
                            .frame(width: CGFloat(stats.down) / CGFloat(max(stats.total, 1)) * 150, height: 20)
                        Spacer()
                    }
                    HStack(spacing: Spacing.xs) {
                        Rectangle()
                            .fill(Color.statusDegraded)
                            .frame(width: CGFloat(stats.degraded) / CGFloat(max(stats.total, 1)) * 150, height: 20)
                        Spacer()
                    }
                }

                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Label("\(stats.up) Up", systemImage: "circle.fill")
                        .foregroundColor(.statusUp)
                        .font(.labelMedium)
                    Label("\(stats.down) Down", systemImage: "circle.fill")
                        .foregroundColor(.statusDown)
                        .font(.labelMedium)
                    Label("\(stats.degraded) Degraded", systemImage: "circle.fill")
                        .foregroundColor(.statusDegraded)
                        .font(.labelMedium)
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct RecentChecksListView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Recent Activity")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text("Check results will appear here")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

### 8.3 ResourcesListView.swift

```swift
import SwiftUI

struct ResourcesListView: View {
    @StateObject private var viewModel = ResourcesListViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.resources.isEmpty {
                    LoadingView(message: "Loading resources...")
                } else if let error = viewModel.error {
                    ErrorView(error: error, retryAction: { Task { await viewModel.loadResources() } })
                } else if viewModel.filteredResources.isEmpty {
                    EmptyStateView(
                        icon: "server.rack",
                        title: "No Resources",
                        message: viewModel.resources.isEmpty ? "No resources configured" : "No resources match your filters",
                        action: viewModel.resources.isEmpty ? nil : { viewModel.clearFilters() },
                        actionTitle: viewModel.resources.isEmpty ? nil : "Clear Filters"
                    )
                } else {
                    List(viewModel.filteredResources) { resource in
                        NavigationLink(value: resource) {
                            ResourceRow(resource: resource)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Resources")
            .searchable(text: $viewModel.searchText, prompt: "Search resources")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Section("Status") {
                            Button("All") { viewModel.selectedStatus = nil }
                            ForEach([ResourceStatus.up, .down, .degraded, .unknown], id: \.self) { status in
                                Button(status.displayName) { viewModel.selectedStatus = status }
                            }
                        }
                        Section("Type") {
                            Button("All Types") { viewModel.selectedType = nil }
                            ForEach(ResourceType.allCases, id: \.self) { type in
                                Button(type.displayName) { viewModel.selectedType = type }
                            }
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .refreshable {
                await viewModel.loadResources()
            }
            .task {
                await viewModel.loadResources()
            }
            .navigationDestination(for: Resource.self) { resource in
                ResourceDetailView(resourceId: resource.id)
            }
        }
    }
}

struct ResourceRow: View {
    let resource: Resource

    var body: some View {
        HStack(spacing: Spacing.md) {
            StatusIndicator(status: resource.status, size: .medium)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(resource.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                HStack(spacing: Spacing.xs) {
                    Image(systemName: resource.resourceType.icon)
                        .font(.system(size: 10))
                    Text(resource.resourceType.displayName)
                }
                .font(.labelSmall)
                .foregroundColor(.textSecondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: Spacing.xxs) {
                Text(resource.status.displayName)
                    .font(.labelSmall)
                    .foregroundColor(resource.status.color)

                if let lastChecked = resource.lastCheckedAt {
                    Text(lastChecked.timeAgo)
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}
```

### 8.4 ResourceDetailView.swift

```swift
import SwiftUI

struct ResourceDetailView: View {
    @StateObject private var viewModel: ResourceDetailViewModel

    init(resourceId: UUID) {
        _viewModel = StateObject(wrappedValue: ResourceDetailViewModel(resourceId: resourceId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingView(message: "Loading details...")
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadDetails() } })
            } else if let resource = viewModel.resource {
                VStack(spacing: Spacing.lg) {
                    ResourceStatusHero(resource: resource, status: viewModel.status)

                    if let uptime = viewModel.uptime {
                        UptimeStatsView(uptime: uptime)
                    }

                    ResourceInfoSection(resource: resource)
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle(viewModel.resource?.name ?? "Resource")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadDetails()
        }
        .task {
            await viewModel.loadDetails()
        }
    }
}

struct ResourceStatusHero: View {
    let resource: Resource
    let status: ResourceStatusResponse?

    var body: some View {
        VStack(spacing: Spacing.md) {
            Circle()
                .fill(resource.status.color)
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: resource.status == .up ? "checkmark" : "xmark")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.white)
                )

            Text(resource.status.displayName)
                .font(.displayMedium)
                .foregroundColor(resource.status.color)

            if let lastCheck = status?.lastCheck {
                VStack(spacing: Spacing.xs) {
                    if let responseTime = lastCheck.responseTimeMs {
                        Text("\(responseTime)ms")
                            .font(.monoLarge)
                            .foregroundColor(.textPrimary)
                    }
                    Text("Last checked \(lastCheck.checkedAt.timeAgo)")
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.xl)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct UptimeStatsView: View {
    let uptime: ResourceUptimeResponse

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Uptime")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            HStack(spacing: Spacing.md) {
                UptimeStatBox(label: "24h", value: uptime.uptime24h)
                UptimeStatBox(label: "7d", value: uptime.uptime7d)
                UptimeStatBox(label: "30d", value: uptime.uptime30d)
                UptimeStatBox(label: "90d", value: uptime.uptime90d)
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct UptimeStatBox: View {
    let label: String
    let value: Double

    var body: some View {
        VStack(spacing: Spacing.xs) {
            Text(String(format: "%.1f%%", value))
                .font(.monoLarge)
                .foregroundColor(value >= 99 ? .statusUp : value >= 95 ? .statusDegraded : .statusDown)
            Text(label)
                .font(.labelSmall)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.md)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct ResourceInfoSection: View {
    let resource: Resource

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Details")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            VStack(spacing: Spacing.sm) {
                InfoRow(label: "Type", value: resource.resourceType.displayName, icon: resource.resourceType.icon)

                if let url = resource.url {
                    InfoRow(label: "URL", value: url, icon: "link")
                }

                if let description = resource.description {
                    InfoRow(label: "Description", value: description, icon: "doc.text")
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct InfoRow: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.textTertiary)
                .frame(width: 20)

            Text(label)
                .font(.labelMedium)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .foregroundColor(.textPrimary)
                .lineLimit(1)
        }
    }
}
```

### 8.5 AlertsListView.swift

```swift
import SwiftUI

struct AlertsListView: View {
    @StateObject private var viewModel = AlertsListViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("View", selection: $viewModel.selectedTab) {
                    Text("Active").tag(0)
                    Text("Acknowledged").tag(1)
                    Text("Rules").tag(2)
                }
                .pickerStyle(.segmented)
                .padding(Spacing.lg)

                Group {
                    if viewModel.isLoading && viewModel.alerts.isEmpty {
                        LoadingView(message: "Loading alerts...")
                    } else if let error = viewModel.error {
                        ErrorView(error: error, retryAction: { Task { await viewModel.loadAlerts() } })
                    } else {
                        switch viewModel.selectedTab {
                        case 0:
                            alertsList(viewModel.activeAlerts, emptyMessage: "No active alerts")
                        case 1:
                            alertsList(viewModel.acknowledgedAlerts, emptyMessage: "No acknowledged alerts")
                        case 2:
                            alertRulesList
                        default:
                            EmptyView()
                        }
                    }
                }
            }
            .navigationTitle("Alerts")
            .refreshable {
                await viewModel.loadAlerts()
                await viewModel.loadAlertRules()
            }
            .task {
                await viewModel.loadAlerts()
                await viewModel.loadAlertRules()
            }
        }
    }

    @ViewBuilder
    private func alertsList(_ alerts: [Alert], emptyMessage: String) -> some View {
        if alerts.isEmpty {
            EmptyStateView(
                icon: "bell.slash",
                title: emptyMessage,
                message: "Alerts will appear here when triggered"
            )
        } else {
            List(alerts) { alert in
                AlertRow(
                    alert: alert,
                    onAcknowledge: { Task { await viewModel.acknowledgeAlert(alert) } },
                    onResolve: { Task { await viewModel.resolveAlert(alert) } }
                )
            }
            .listStyle(.plain)
        }
    }

    @ViewBuilder
    private var alertRulesList: some View {
        if viewModel.alertRules.isEmpty {
            EmptyStateView(
                icon: "bell.badge",
                title: "No Alert Rules",
                message: "Configure alert rules in the web app"
            )
        } else {
            List(viewModel.alertRules) { rule in
                AlertRuleRow(rule: rule)
            }
            .listStyle(.plain)
        }
    }
}

struct AlertRow: View {
    let alert: Alert
    let onAcknowledge: () -> Void
    let onResolve: () -> Void

    var body: some View {
        HStack(spacing: Spacing.md) {
            Rectangle()
                .fill(alert.severity.color)
                .frame(width: 4)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(alert.title)
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)

                    Spacer()

                    SeverityBadge(severity: alert.severity)
                }

                Text(alert.message)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
                    .lineLimit(2)

                HStack {
                    StatusBadge(status: alert.status)

                    Spacer()

                    Text(alert.triggeredAt.timeAgo)
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(.vertical, Spacing.sm)
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            if alert.status != .resolved {
                Button(action: onResolve) {
                    Label("Resolve", systemImage: "checkmark.circle")
                }
                .tint(.statusUp)
            }

            if alert.status == .active {
                Button(action: onAcknowledge) {
                    Label("Acknowledge", systemImage: "eye")
                }
                .tint(.brandPrimary)
            }
        }
    }
}

struct AlertRuleRow: View {
    let rule: AlertRule

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(rule.isEnabled ? Color.statusUp : Color.statusUnknown)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(rule.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                Text(rule.ruleType)
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            if let threshold = rule.thresholdValue {
                Text("\(rule.comparisonOperator ?? "") \(Int(threshold))")
                    .font(.monoMedium)
                    .foregroundColor(.textSecondary)
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}
```

### 8.6 ClientsListView.swift

```swift
import SwiftUI

struct ClientsListView: View {
    @StateObject private var viewModel = ClientsListViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.clients.isEmpty {
                    LoadingView(message: "Loading clients...")
                } else if let error = viewModel.error {
                    ErrorView(error: error, retryAction: { Task { await viewModel.loadClients() } })
                } else if viewModel.filteredClients.isEmpty {
                    EmptyStateView(
                        icon: "building.2",
                        title: "No Clients",
                        message: "Clients will appear here"
                    )
                } else {
                    List(viewModel.filteredClients) { client in
                        NavigationLink(value: client) {
                            ClientRow(client: client)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Clients")
            .searchable(text: $viewModel.searchText, prompt: "Search clients")
            .refreshable {
                await viewModel.loadClients()
            }
            .task {
                await viewModel.loadClients()
            }
            .navigationDestination(for: Client.self) { client in
                ClientDetailView(clientId: client.id)
            }
        }
    }
}

struct ClientRow: View {
    let client: Client

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(client.status == .active ? Color.statusUp : Color.statusUnknown)
                .frame(width: 10, height: 10)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(client.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                if let email = client.contactEmail {
                    Text(email)
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }
            }

            Spacer()

            Text(client.status.rawValue.capitalized)
                .font(.labelSmall)
                .foregroundColor(client.status == .active ? .statusUp : .textTertiary)
        }
        .padding(.vertical, Spacing.xs)
    }
}
```

### 8.7 ClientDetailView.swift

```swift
import SwiftUI

struct ClientDetailView: View {
    @StateObject private var viewModel: ClientDetailViewModel

    init(clientId: UUID) {
        _viewModel = StateObject(wrappedValue: ClientDetailViewModel(clientId: clientId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingView(message: "Loading client...")
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadDetails() } })
            } else if let client = viewModel.client {
                VStack(spacing: Spacing.lg) {
                    ClientInfoCard(client: client)
                    EnvironmentsSection(environments: viewModel.environments)
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle(viewModel.client?.name ?? "Client")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadDetails()
        }
        .task {
            await viewModel.loadDetails()
        }
    }
}

struct ClientInfoCard: View {
    let client: Client

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Circle()
                    .fill(client.status == .active ? Color.statusUp : Color.statusUnknown)
                    .frame(width: 12, height: 12)
                Text(client.status.rawValue.capitalized)
                    .font(.labelMedium)
                    .foregroundColor(client.status == .active ? .statusUp : .textTertiary)
            }

            if let email = client.contactEmail {
                InfoRow(label: "Contact", value: email, icon: "envelope")
            }

            if let description = client.description {
                InfoRow(label: "Description", value: description, icon: "doc.text")
            }

            if let fee = client.monthlyHostingFee {
                InfoRow(label: "Monthly Fee", value: "$\(fee)", icon: "dollarsign.circle")
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct EnvironmentsSection: View {
    let environments: [Environment]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Environments")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            if environments.isEmpty {
                Text("No environments configured")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
            } else {
                ForEach(environments) { env in
                    EnvironmentRow(environment: env)
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct EnvironmentRow: View {
    let environment: Environment

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "folder")
                .foregroundColor(.brandPrimary)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(environment.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                if let description = environment.description {
                    Text(description)
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12))
                .foregroundColor(.textTertiary)
        }
        .padding(Spacing.md)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
```

### 8.8 IncidentsListView.swift

```swift
import SwiftUI

struct IncidentsListView: View {
    @StateObject private var viewModel = IncidentsListViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.incidents.isEmpty {
                    LoadingView(message: "Loading incidents...")
                } else if let error = viewModel.error {
                    ErrorView(error: error, retryAction: { Task { await viewModel.loadIncidents() } })
                } else if viewModel.filteredIncidents.isEmpty {
                    EmptyStateView(
                        icon: "exclamationmark.triangle",
                        title: "No Incidents",
                        message: "Incidents will appear here"
                    )
                } else {
                    List(viewModel.filteredIncidents) { incident in
                        IncidentRow(incident: incident)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Incidents")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("All") { viewModel.selectedStatus = nil }
                        ForEach([IncidentStatus.open, .investigating, .resolved], id: \.self) { status in
                            Button(status.rawValue.capitalized) { viewModel.selectedStatus = status }
                        }
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .refreshable {
                await viewModel.loadIncidents()
            }
            .task {
                await viewModel.loadIncidents()
            }
        }
    }
}

struct IncidentRow: View {
    let incident: Incident

    var body: some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack {
                    Text(incident.title)
                        .font(.labelLarge)
                        .foregroundColor(.textPrimary)

                    Spacer()

                    SeverityBadge(severity: incident.severity)
                }

                if let description = incident.description {
                    Text(description)
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                        .lineLimit(2)
                }

                HStack {
                    IncidentStatusBadge(status: incident.status)

                    Spacer()

                    Text(incident.createdAt.timeAgo)
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(.vertical, Spacing.sm)
    }
}

struct IncidentStatusBadge: View {
    let status: IncidentStatus

    var body: some View {
        Text(status.rawValue.capitalized)
            .font(.labelSmall)
            .foregroundColor(foregroundColor)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xxs)
            .background(backgroundColor)
            .clipShape(Capsule())
    }

    private var foregroundColor: Color {
        switch status {
        case .open: return .white
        case .investigating: return .severityWarning
        case .resolved: return .statusUp
        }
    }

    private var backgroundColor: Color {
        switch status {
        case .open: return .severityCritical
        case .investigating: return .severityWarning.opacity(0.2)
        case .resolved: return .statusUp.opacity(0.2)
        }
    }
}
```

### 8.9 AzureOverviewView.swift

```swift
import SwiftUI

struct AzureOverviewView: View {
    @StateObject private var viewModel = AzureOverviewViewModel()

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingView(message: "Loading Azure data...")
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadOverview() } })
            } else {
                VStack(spacing: Spacing.lg) {
                    if let costSummary = viewModel.costSummary {
                        CostSummaryCard(summary: costSummary)
                    }

                    TenantsList(tenants: viewModel.tenants, selectedTenant: viewModel.selectedTenant) { tenant in
                        Task { await viewModel.selectTenant(tenant) }
                    }
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle("Azure")
        .refreshable {
            await viewModel.loadOverview()
        }
        .task {
            await viewModel.loadOverview()
        }
    }
}

struct CostSummaryCard: View {
    let summary: AzureCostSummary

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Cost Summary")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("Total Cost")
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)

                    Text("$\(summary.totalCost as NSDecimalNumber, formatter: currencyFormatter)")
                        .font(.displayMedium)
                        .foregroundColor(.textPrimary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: Spacing.xs) {
                    Text("Period")
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)

                    Text("\(summary.period.from) - \(summary.period.to)")
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var currencyFormatter: NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter
    }
}

struct TenantsList: View {
    let tenants: [AzureTenant]
    let selectedTenant: AzureTenant?
    let onSelect: (AzureTenant?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Azure Tenants")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            if tenants.isEmpty {
                Text("No Azure tenants configured")
                    .font(.bodyMedium)
                    .foregroundColor(.textSecondary)
            } else {
                VStack(spacing: Spacing.sm) {
                    TenantButton(title: "All Tenants", isSelected: selectedTenant == nil) {
                        onSelect(nil)
                    }

                    ForEach(tenants) { tenant in
                        TenantButton(title: tenant.name, isSelected: selectedTenant?.id == tenant.id) {
                            onSelect(tenant)
                        }
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct TenantButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(.labelLarge)
                    .foregroundColor(isSelected ? .white : .textPrimary)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark")
                        .foregroundColor(.white)
                }
            }
            .padding(Spacing.md)
            .background(isSelected ? Color.brandPrimary : Color.backgroundTertiary)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}
```

### 8.10 SettingsView.swift

```swift
import SwiftUI

struct SettingsView: View {
    @StateObject private var viewModel = SettingsViewModel()
    @EnvironmentObject var authService: AuthService

    var body: some View {
        List {
            Section("Appearance") {
                Picker("Theme", selection: $viewModel.selectedTheme) {
                    ForEach(SettingsViewModel.Theme.allCases, id: \.self) { theme in
                        Text(theme.rawValue.capitalized).tag(theme)
                    }
                }
            }

            Section("Security") {
                if viewModel.canUseBiometrics {
                    Toggle(viewModel.biometricTypeLabel, isOn: $viewModel.biometricsEnabled)
                }
            }

            Section("Notifications") {
                Toggle("Push Notifications", isOn: $viewModel.notificationsEnabled)
            }

            Section {
                Button(role: .destructive) {
                    Task { await viewModel.signOut() }
                } label: {
                    HStack {
                        Spacer()
                        Text("Sign Out")
                        Spacer()
                    }
                }
            }

            Section {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0")
                        .foregroundColor(.textSecondary)
                }
            }
        }
        .navigationTitle("Settings")
    }
}
```

### 8.11 MoreMenuView.swift

```swift
import SwiftUI

struct MoreMenuView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Azure") {
                    NavigationLink(destination: AzureOverviewView()) {
                        Label("Azure Overview", systemImage: "cloud.fill")
                    }

                    NavigationLink(destination: AzureHealthIssuesView()) {
                        Label("Health Issues", systemImage: "heart.text.square")
                    }

                    NavigationLink(destination: AzureCostReportView()) {
                        Label("Cost Report", systemImage: "dollarsign.circle")
                    }
                }

                Section("Management") {
                    NavigationLink(destination: IncidentsListView()) {
                        Label("Incidents", systemImage: "exclamationmark.triangle")
                    }
                }

                Section("Account") {
                    NavigationLink(destination: SettingsView()) {
                        Label("Settings", systemImage: "gearshape.fill")
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}

struct AzureHealthIssuesView: View {
    var body: some View {
        EmptyStateView(
            icon: "heart.text.square",
            title: "Health Issues",
            message: "Azure health recommendations will appear here"
        )
        .navigationTitle("Health Issues")
    }
}

struct AzureCostReportView: View {
    var body: some View {
        EmptyStateView(
            icon: "chart.bar.doc.horizontal",
            title: "Cost Report",
            message: "Detailed cost analysis will appear here"
        )
        .navigationTitle("Cost Report")
    }
}
```

---

## PHASE 9: NAVIGATION

### 9.1 MainTabView.swift

```swift
import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    @StateObject private var alertsViewModel = AlertsListViewModel()

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.fill")
                }
                .tag(0)

            ResourcesListView()
                .tabItem {
                    Label("Resources", systemImage: "server.rack")
                }
                .tag(1)

            AlertsListView()
                .tabItem {
                    Label("Alerts", systemImage: "bell.fill")
                }
                .tag(2)
                .badge(alertsViewModel.activeAlerts.count)

            ClientsListView()
                .tabItem {
                    Label("Clients", systemImage: "building.2.fill")
                }
                .tag(3)

            MoreMenuView()
                .tabItem {
                    Label("More", systemImage: "ellipsis")
                }
                .tag(4)
        }
        .task {
            await alertsViewModel.loadAlerts()
        }
    }
}
```

### 9.2 QuartzMobileApp.swift

```swift
import SwiftUI

@main
struct QuartzMobileApp: App {
    @StateObject private var authService = AuthService.shared

    var body: some Scene {
        WindowGroup {
            Group {
                if authService.isAuthenticated {
                    MainTabView()
                } else {
                    LoginView()
                }
            }
            .environmentObject(authService)
            .onOpenURL { url in
                Task {
                    try? await authService.handleOAuthCallback(url: url)
                }
            }
        }
    }
}
```

---

## PHASE 10: INFO.PLIST CONFIGURATION

Add these entries to Info.plist:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>com.quartz.monitor</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>quartzmonitor</string>
            </array>
        </dict>
    </array>
    <key>NSFaceIDUsageDescription</key>
    <string>Use Face ID to sign in to Quartz Monitor</string>
</dict>
</plist>
```

---

## BUILD VERIFICATION CHECKLIST

After completing all phases, verify:

- [ ] App compiles without errors
- [ ] App launches to login screen
- [ ] Azure SSO button initiates OAuth flow
- [ ] After auth, main tab view appears
- [ ] Dashboard loads and displays data
- [ ] Resources list shows resources
- [ ] Resource detail shows status and uptime
- [ ] Alerts list shows alerts with swipe actions
- [ ] Acknowledge/Resolve alerts works
- [ ] Clients list shows clients
- [ ] Client detail shows environments
- [ ] Incidents list shows incidents
- [ ] Azure overview shows cost summary
- [ ] Settings allows sign out
- [ ] Pull-to-refresh works on all lists
- [ ] Error states show retry option
- [ ] Empty states show appropriate messages
- [ ] Dark mode works correctly
- [ ] All navigation flows work

---

## EXECUTION INSTRUCTIONS

1. Create Xcode project named "QuartzMobile"
2. Add Swift Package dependencies
3. Create all folders matching the structure
4. Implement files in phase order (1-10)
5. Build and fix any compilation errors
6. Test each screen as you complete it
7. Run full verification checklist at the end

**START NOW - Build the complete app following these specifications.**
