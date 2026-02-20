import Foundation

enum APIEndpoint {
    // Health
    case health

    // User
    case me
    case users
    case user(id: UUID)
    case createUser
    case updateUser(id: UUID)
    case deleteUser(id: UUID)

    // Dashboard
    case dashboardSummary

    // Clients
    case clients(status: String? = nil, limit: Int = 50, offset: Int = 0)
    case client(id: UUID)
    case clientEnvironments(clientId: UUID)
    case createClient
    case updateClient(id: UUID)
    case deleteClient(id: UUID)

    // Environments
    case environments(clientId: UUID? = nil, limit: Int = 50, offset: Int = 0)
    case environment(id: UUID)

    // Resources
    case resources(status: String? = nil, type: String? = nil, clientId: UUID? = nil, limit: Int = 50, offset: Int = 0)
    case resource(id: UUID)
    case resourceStatus(id: UUID)
    case resourceUptime(id: UUID, period: String = "30d")
    case createResource
    case updateResource(id: UUID)
    case deleteResource(id: UUID)

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
    case createAlertRule
    case updateAlertRule(id: UUID)
    case deleteAlertRule(id: UUID)

    // Incidents
    case incidents(status: String? = nil, severity: String? = nil, limit: Int = 50, offset: Int = 0)
    case incident(id: UUID)
    case createIncident
    case updateIncident(id: UUID)

    // Azure
    case azureTenants
    case azureTenant(id: UUID)
    case azureResources(tenantId: UUID? = nil, page: Int = 1, perPage: Int = 100)
    case azureResource(id: UUID)
    case azureResourceMetrics(id: UUID)
    case azureResourceCosts(id: UUID)
    case azureCosts(tenantId: UUID? = nil, dateFrom: String? = nil, dateTo: String? = nil, page: Int = 1, perPage: Int = 100)
    case azureCostSummary(tenantId: UUID? = nil, days: Int = 30)
    case azureCostTrend(tenantId: UUID? = nil, days: Int = 30)
    case azureCostByResourceGroup(tenantId: UUID? = nil)
    case azureCostAnomalies
    case azureCostTopResources(tenantId: UUID? = nil, days: Int = 30, limit: Int = 20)
    case azureSyncStatus
    case azureHealthIssues(tenantId: UUID? = nil)
    case azureHealthOverview(tenantId: UUID? = nil)
    case azureStatsSummary(tenantId: UUID? = nil, days: Int = 30)

    // SQL Monitoring
    case sqlDatabases(tenantId: UUID? = nil)
    case sqlDatabasesOverview(tenantId: UUID? = nil)
    case sqlStatsSummary(tenantId: UUID? = nil)
    case sqlDatabase(id: UUID)
    // Azure SQL stats endpoints (use resourceId which is the database UUID)
    case sqlPerformance(resourceId: UUID)
    case sqlInsights(resourceId: UUID, limit: Int = 20)
    case sqlWaitStatistics(resourceId: UUID)
    case sqlRecommendations(resourceId: UUID)
    case sqlReplication(resourceId: UUID, hours: Int = 24)
    case sqlStorage(resourceId: UUID, hours: Int = 168)

    // Notification Channels
    case notificationChannels(channelType: String? = nil, isEnabled: Bool? = nil)
    case notificationChannel(id: UUID)
    case createNotificationChannel
    case updateNotificationChannel(id: UUID)
    case deleteNotificationChannel(id: UUID)
    case testNotificationChannel(id: UUID)

    // Alert Rule Exclusions
    case alertRuleExclusions(alertRuleId: UUID? = nil, resourceId: UUID? = nil)
    case createAlertRuleExclusion
    case deleteAlertRuleExclusion(id: UUID)

    // Alert Templates
    case alertTemplates(ruleType: String? = nil, azureResourceType: String? = nil)
    case alertTemplate(id: UUID)
    case createAlertTemplate
    case updateAlertTemplate(id: UUID)
    case deleteAlertTemplate(id: UUID)
    case applyAlertTemplate(id: UUID)

    // Alert Notification Links
    case alertNotificationLinks(alertRuleId: UUID? = nil, channelId: UUID? = nil)
    case createAlertNotificationLink
    case deleteAlertNotificationLink(id: UUID)

    // Azure Cost Alert Rules
    case azureCostAlertRules
    case azureCostAlertRule(id: UUID)
    case createAzureCostAlertRule
    case updateAzureCostAlertRule(id: UUID)
    case deleteAzureCostAlertRule(id: UUID)

    // Azure Cost Alerts
    case azureCostAlerts(status: String? = nil)
    case azureCostAlert(id: UUID)
    case acknowledgeAzureCostAlert(id: UUID)
    case resolveAzureCostAlert(id: UUID)

    // Azure Idle Resources
    case azureIdleResources(tenantId: UUID? = nil)
    case azureIdleResource(id: UUID)
    case ignoreAzureIdleResource(id: UUID)
    case reactivateAzureIdleResource(id: UUID)

    // Azure Sync Logs
    case azureSyncLogs(tenantId: UUID? = nil, limit: Int = 50)
    case azureSyncLog(id: UUID)

    // Azure Sync Progress
    case azureSyncProgress(tenantId: UUID? = nil)
    case azureSyncProgressDetail(id: UUID)
    case azureSyncProgressActive

    // Check Results
    case checkResultsList(resourceId: UUID? = nil, limit: Int = 100)
    case checkResult(id: UUID)
    case checkResultsStats(resourceId: UUID? = nil, period: String = "24h")

    // Log Analytics Workspaces
    case logAnalyticsWorkspaces(tenantId: UUID? = nil)
    case logAnalyticsWorkspace(id: UUID)
    case createLogAnalyticsWorkspace
    case updateLogAnalyticsWorkspace(id: UUID)
    case deleteLogAnalyticsWorkspace(id: UUID)

    // Push Notifications
    case registerDevice(token: String, platform: String, deviceName: String?)
    case unregisterDevice(token: String)
    case getNotificationPreferences
    case updateNotificationPreferences(preferences: NotificationPreferences)

    // Admin
    case systemSettings
    case updateSystemSettings
    case apiKeys
    case createApiKey
    case revokeApiKey(id: UUID)
    case syncScheduler
    case updateSyncScheduler
    case syncLogs(limit: Int = 100)

    var path: String {
        switch self {
        case .health: return "/health"
        case .me: return "/me"
        case .users: return "/users"
        case .user(let id): return "/users/\(id)"
        case .createUser: return "/users"
        case .updateUser(let id): return "/users/\(id)"
        case .deleteUser(let id): return "/users/\(id)"
        case .dashboardSummary: return "/dashboard/summary"
        case .clients: return "/clients"
        case .client(let id): return "/clients/\(id)"
        case .clientEnvironments(let clientId): return "/clients/\(clientId)/environments"
        case .environments: return "/environments"
        case .environment(let id): return "/environments/\(id)"
        case .createClient: return "/clients"
        case .updateClient(let id): return "/clients/\(id)"
        case .deleteClient(let id): return "/clients/\(id)"
        case .resources: return "/resources"
        case .resource(let id): return "/resources/\(id)"
        case .resourceStatus(let id): return "/resources/\(id)/status"
        case .resourceUptime(let id, _): return "/resources/\(id)/uptime"
        case .createResource: return "/resources"
        case .updateResource(let id): return "/resources/\(id)"
        case .deleteResource(let id): return "/resources/\(id)"
        case .monitoringChecks: return "/monitoring-checks"
        case .checkResults(let checkId, _): return "/monitoring-checks/\(checkId)/results"
        case .alerts: return "/alerts"
        case .alert(let id): return "/alerts/\(id)"
        case .acknowledgeAlert(let id): return "/alerts/\(id)/acknowledge"
        case .resolveAlert(let id): return "/alerts/\(id)/resolve"
        case .alertRules: return "/alert-rules"
        case .alertRule(let id): return "/alert-rules/\(id)"
        case .createAlertRule: return "/alert-rules"
        case .updateAlertRule(let id): return "/alert-rules/\(id)"
        case .deleteAlertRule(let id): return "/alert-rules/\(id)"
        case .incidents: return "/incidents"
        case .incident(let id): return "/incidents/\(id)"
        case .createIncident: return "/incidents"
        case .updateIncident(let id): return "/incidents/\(id)"
        case .azureTenants: return "/azure/tenants"
        case .azureTenant(let id): return "/azure/tenants/\(id)"
        case .azureResources: return "/azure/resources"
        case .azureResource(let id): return "/azure/resources/\(id)"
        case .azureResourceMetrics(let id): return "/azure/resources/\(id)/metrics"
        case .azureResourceCosts(let id): return "/azure/resources/\(id)/costs"
        case .azureCosts: return "/azure/costs"
        case .azureCostAnomalies: return "/azure/costs/anomalies"
        case .azureCostTopResources: return "/azure/costs/top-resources"
        case .azureCostSummary: return "/azure/costs/summary"
        case .azureCostTrend: return "/azure/costs/trend"
        case .azureCostByResourceGroup: return "/azure/costs/by-resource-group"
        case .azureSyncStatus: return "/azure/sync/status"
        case .azureHealthIssues: return "/azure/health-issues"
        case .azureHealthOverview: return "/azure/health/overview"
        case .azureStatsSummary: return "/azure/stats/summary"
        case .sqlDatabases: return "/sql/databases"
        case .sqlDatabasesOverview: return "/sql/databases/overview"
        case .sqlStatsSummary: return "/sql/stats/summary"
        case .sqlDatabase(let id): return "/sql/databases/\(id)"
        case .sqlPerformance(let resourceId): return "/azure/sql/\(resourceId)/performance"
        case .sqlInsights(let resourceId, _): return "/azure/sql/\(resourceId)/insights"
        case .sqlWaitStatistics(let resourceId): return "/azure/sql/\(resourceId)/wait-stats"
        case .sqlRecommendations(let resourceId): return "/azure/sql/\(resourceId)/recommendations"
        case .sqlReplication(let resourceId, _): return "/azure/sql/\(resourceId)/replication"
        case .sqlStorage(let resourceId, _): return "/azure/sql/\(resourceId)/storage"

        // Notification Channels
        case .notificationChannels: return "/notification-channels"
        case .notificationChannel(let id): return "/notification-channels/\(id)"
        case .createNotificationChannel: return "/notification-channels"
        case .updateNotificationChannel(let id): return "/notification-channels/\(id)"
        case .deleteNotificationChannel(let id): return "/notification-channels/\(id)"
        case .testNotificationChannel(let id): return "/notification-channels/\(id)/test"

        // Alert Rule Exclusions
        case .alertRuleExclusions: return "/alert-rule-exclusions"
        case .createAlertRuleExclusion: return "/alert-rule-exclusions"
        case .deleteAlertRuleExclusion(let id): return "/alert-rule-exclusions/\(id)"

        // Alert Templates
        case .alertTemplates: return "/alert-templates"
        case .alertTemplate(let id): return "/alert-templates/\(id)"
        case .createAlertTemplate: return "/alert-templates"
        case .updateAlertTemplate(let id): return "/alert-templates/\(id)"
        case .deleteAlertTemplate(let id): return "/alert-templates/\(id)"
        case .applyAlertTemplate(let id): return "/alert-templates/\(id)/apply"

        // Alert Notification Links
        case .alertNotificationLinks: return "/alert-notification-links"
        case .createAlertNotificationLink: return "/alert-notification-links"
        case .deleteAlertNotificationLink(let id): return "/alert-notification-links/\(id)"

        // Azure Cost Alert Rules
        case .azureCostAlertRules: return "/azure/cost-alert-rules"
        case .azureCostAlertRule(let id): return "/azure/cost-alert-rules/\(id)"
        case .createAzureCostAlertRule: return "/azure/cost-alert-rules"
        case .updateAzureCostAlertRule(let id): return "/azure/cost-alert-rules/\(id)"
        case .deleteAzureCostAlertRule(let id): return "/azure/cost-alert-rules/\(id)"

        // Azure Cost Alerts
        case .azureCostAlerts: return "/azure/cost-alerts"
        case .azureCostAlert(let id): return "/azure/cost-alerts/\(id)"
        case .acknowledgeAzureCostAlert(let id): return "/azure/cost-alerts/\(id)/acknowledge"
        case .resolveAzureCostAlert(let id): return "/azure/cost-alerts/\(id)/resolve"

        // Azure Idle Resources
        case .azureIdleResources: return "/azure/idle-resources"
        case .azureIdleResource(let id): return "/azure/idle-resources/\(id)"
        case .ignoreAzureIdleResource(let id): return "/azure/idle-resources/\(id)/ignore"
        case .reactivateAzureIdleResource(let id): return "/azure/idle-resources/\(id)/reactivate"

        // Azure Sync Logs
        case .azureSyncLogs: return "/azure/sync-logs"
        case .azureSyncLog(let id): return "/azure/sync-logs/\(id)"

        // Azure Sync Progress
        case .azureSyncProgress: return "/azure/sync-progress"
        case .azureSyncProgressDetail(let id): return "/azure/sync-progress/\(id)"
        case .azureSyncProgressActive: return "/azure/sync-progress/active"

        // Check Results
        case .checkResultsList: return "/check-results"
        case .checkResult(let id): return "/check-results/\(id)"
        case .checkResultsStats: return "/check-results/stats"

        // Log Analytics Workspaces
        case .logAnalyticsWorkspaces: return "/log-analytics-workspaces"
        case .logAnalyticsWorkspace(let id): return "/log-analytics-workspaces/\(id)"
        case .createLogAnalyticsWorkspace: return "/log-analytics-workspaces"
        case .updateLogAnalyticsWorkspace(let id): return "/log-analytics-workspaces/\(id)"
        case .deleteLogAnalyticsWorkspace(let id): return "/log-analytics-workspaces/\(id)"

        case .registerDevice: return "/devices/register"
        case .unregisterDevice: return "/devices/unregister"
        case .getNotificationPreferences: return "/notifications/preferences"
        case .updateNotificationPreferences: return "/notifications/preferences"
        case .systemSettings: return "/admin/settings"
        case .updateSystemSettings: return "/admin/settings"
        case .apiKeys: return "/admin/api-keys"
        case .createApiKey: return "/admin/api-keys"
        case .revokeApiKey(let id): return "/admin/api-keys/\(id)"
        case .syncScheduler: return "/admin/sync-scheduler"
        case .updateSyncScheduler: return "/admin/sync-scheduler"
        case .syncLogs: return "/admin/sync-logs"
        }
    }

    var method: HTTPMethod {
        switch self {
        // POST methods
        case .registerDevice, .createUser, .createClient, .createResource, .createAlertRule, .createIncident, .createApiKey,
             .createNotificationChannel, .testNotificationChannel, .createAlertRuleExclusion,
             .createAlertTemplate, .applyAlertTemplate, .createAlertNotificationLink,
             .createAzureCostAlertRule, .createLogAnalyticsWorkspace:
            return .post

        // PUT methods
        case .acknowledgeAlert, .resolveAlert,
             .updateUser, .updateClient, .updateResource, .updateAlertRule, .updateIncident, .updateSystemSettings, .updateSyncScheduler, .updateNotificationPreferences,
             .updateNotificationChannel, .updateAlertTemplate, .updateAzureCostAlertRule,
             .acknowledgeAzureCostAlert, .resolveAzureCostAlert,
             .ignoreAzureIdleResource, .reactivateAzureIdleResource,
             .updateLogAnalyticsWorkspace:
            return .put

        // DELETE methods
        case .deleteUser, .deleteClient, .deleteResource, .deleteAlertRule, .unregisterDevice, .revokeApiKey,
             .deleteNotificationChannel, .deleteAlertRuleExclusion, .deleteAlertTemplate,
             .deleteAlertNotificationLink, .deleteAzureCostAlertRule, .deleteLogAnalyticsWorkspace:
            return .delete

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

        case .environments(let clientId, let limit, let offset):
            if let clientId = clientId { items.append(URLQueryItem(name: "client_id", value: clientId.uuidString)) }
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

        case .azureResources(let tenantId, let page, let perPage):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            items.append(URLQueryItem(name: "page", value: "\(page)"))
            items.append(URLQueryItem(name: "per_page", value: "\(perPage)"))

        case .azureCosts(let tenantId, let dateFrom, let dateTo, let page, let perPage):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            if let dateFrom = dateFrom { items.append(URLQueryItem(name: "date_from", value: dateFrom)) }
            if let dateTo = dateTo { items.append(URLQueryItem(name: "date_to", value: dateTo)) }
            items.append(URLQueryItem(name: "page", value: "\(page)"))
            items.append(URLQueryItem(name: "per_page", value: "\(perPage)"))

        case .azureCostSummary(let tenantId, let days):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            items.append(URLQueryItem(name: "days", value: "\(days)"))

        case .azureCostTrend(let tenantId, let days):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            items.append(URLQueryItem(name: "days", value: "\(days)"))

        case .azureCostByResourceGroup(let tenantId):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }

        case .azureHealthIssues(let tenantId):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }

        case .azureHealthOverview(let tenantId):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }

        case .azureStatsSummary(let tenantId, let days):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            items.append(URLQueryItem(name: "days", value: "\(days)"))

        case .azureCostTopResources(let tenantId, let days, let limit):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            items.append(URLQueryItem(name: "days", value: "\(days)"))
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))

        case .sqlDatabases(let tenantId):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }

        case .sqlDatabasesOverview(let tenantId):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }

        case .sqlStatsSummary(let tenantId):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }

        case .sqlInsights(_, let limit):
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))

        case .sqlReplication(_, let hours):
            items.append(URLQueryItem(name: "hours", value: "\(hours)"))

        case .sqlStorage(_, let hours):
            items.append(URLQueryItem(name: "hours", value: "\(hours)"))

        case .syncLogs(let limit):
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))

        // Notification Channels
        case .notificationChannels(let channelType, let isEnabled):
            if let channelType = channelType { items.append(URLQueryItem(name: "channel_type", value: channelType)) }
            if let isEnabled = isEnabled { items.append(URLQueryItem(name: "is_enabled", value: "\(isEnabled)")) }

        // Alert Rule Exclusions
        case .alertRuleExclusions(let alertRuleId, let resourceId):
            if let alertRuleId = alertRuleId { items.append(URLQueryItem(name: "alert_rule_id", value: alertRuleId.uuidString)) }
            if let resourceId = resourceId { items.append(URLQueryItem(name: "resource_id", value: resourceId.uuidString)) }

        // Alert Templates
        case .alertTemplates(let ruleType, let azureResourceType):
            if let ruleType = ruleType { items.append(URLQueryItem(name: "rule_type", value: ruleType)) }
            if let azureResourceType = azureResourceType { items.append(URLQueryItem(name: "azure_resource_type", value: azureResourceType)) }

        // Alert Notification Links
        case .alertNotificationLinks(let alertRuleId, let channelId):
            if let alertRuleId = alertRuleId { items.append(URLQueryItem(name: "alert_rule_id", value: alertRuleId.uuidString)) }
            if let channelId = channelId { items.append(URLQueryItem(name: "channel_id", value: channelId.uuidString)) }

        // Azure Cost Alerts
        case .azureCostAlerts(let status):
            if let status = status { items.append(URLQueryItem(name: "status", value: status)) }

        // Azure Idle Resources
        case .azureIdleResources(let tenantId):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }

        // Azure Sync Logs
        case .azureSyncLogs(let tenantId, let limit):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))

        // Azure Sync Progress
        case .azureSyncProgress(let tenantId):
            if let tenantId = tenantId { items.append(URLQueryItem(name: "tenant_id", value: tenantId.uuidString)) }

        // Check Results
        case .checkResultsList(let resourceId, let limit):
            if let resourceId = resourceId { items.append(URLQueryItem(name: "resource_id", value: resourceId.uuidString)) }
            items.append(URLQueryItem(name: "limit", value: "\(limit)"))

        case .checkResultsStats(let resourceId, let period):
            if let resourceId = resourceId { items.append(URLQueryItem(name: "resource_id", value: resourceId.uuidString)) }
            items.append(URLQueryItem(name: "period", value: period))

        // Log Analytics Workspaces
        case .logAnalyticsWorkspaces(let tenantId):
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

    var bodyData: Data? {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase

        switch self {
        case .registerDevice(let token, let platform, let deviceName):
            var body: [String: Any] = [
                "token": token,
                "platform": platform
            ]
            if let deviceName = deviceName {
                body["device_name"] = deviceName
            }
            return try? JSONSerialization.data(withJSONObject: body)

        case .unregisterDevice(let token):
            let body = ["token": token]
            return try? JSONSerialization.data(withJSONObject: body)

        case .updateNotificationPreferences(let preferences):
            return try? encoder.encode(preferences)

        default:
            return nil
        }
    }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
}
