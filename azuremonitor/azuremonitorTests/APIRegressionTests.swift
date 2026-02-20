import XCTest
@testable import azuremonitor

/// Comprehensive regression tests to verify API responses match UI expectations
/// These tests catch situations where:
/// - API returns data but UI shows nothing
/// - API fields are missing that the UI expects
/// - Data structures don't match between API and models
final class APIRegressionTests: XCTestCase {

    var apiClient: APIClient!
    let keychainService = KeychainService()

    static let testAPIKey = ProcessInfo.processInfo.environment["AZURE_MONITOR_API_KEY"] ?? "qtz_d2NP1gT-7Qrj9id8XIT2bj5Hlc5xhHeBGEOAd4h7mTI"

    override func setUp() {
        super.setUp()
        if !Self.testAPIKey.isEmpty && Self.testAPIKey != "YOUR_API_KEY_HERE" {
            keychainService.storeAPIKey(Self.testAPIKey)
        }
        apiClient = APIClient.shared
    }

    // MARK: - Dashboard Tests

    func testDashboardSummary_HasAllRequiredFields() async throws {
        let summary: DashboardSummary = try await apiClient.request(.dashboardSummary)

        // Verify all required fields are present and reasonable
        XCTAssertGreaterThanOrEqual(summary.resourcesCount, 0, "Resources count should be >= 0")
        XCTAssertGreaterThanOrEqual(summary.clientsCount, 0, "Clients count should be >= 0")
        XCTAssertGreaterThanOrEqual(summary.activeAlertsCount, 0, "Active alerts count should be >= 0")

        print("Dashboard Summary:")
        print("  - Resources: \(summary.resourcesCount)")
        print("  - Clients: \(summary.clientsCount)")
        print("  - Active Alerts: \(summary.activeAlertsCount)")
    }

    // MARK: - Azure Tests

    func testAzureTenants_ReturnsValidData() async throws {
        let tenants: [AzureTenant] = try await apiClient.request(.azureTenants)

        print("Azure Tenants: \(tenants.count) found")

        for tenant in tenants {
            XCTAssertFalse(tenant.name.isEmpty, "Tenant name should not be empty")
            print("  - \(tenant.name) (ID: \(tenant.id))")
        }
    }

    func testAzureResources_HasRequiredFields() async throws {
        let resources: [AzureResource] = try await apiClient.request(.azureResources())

        print("Azure Resources: \(resources.count) found")

        guard let first = resources.first else {
            print("  ⚠️ No resources found - cannot validate fields")
            return
        }

        // Check required fields
        XCTAssertFalse(first.name.isEmpty, "Resource name should not be empty")
        XCTAssertFalse(first.resourceType.isEmpty, "Resource type should not be empty")
        XCTAssertFalse(first.location.isEmpty, "Location should not be empty")
        XCTAssertFalse(first.resourceGroup.isEmpty, "Resource group should not be empty")

        // Check optional fields that UI depends on
        let hasOptimizationScore = resources.contains { $0.optimizationScore != nil }
        let hasTenantInfo = resources.contains { $0.azureTenants != nil }

        print("  - Has optimization scores: \(hasOptimizationScore)")
        print("  - Has tenant info: \(hasTenantInfo)")

        if !hasOptimizationScore {
            print("  ⚠️ WARNING: No resources have optimization scores - UI will show '--'")
        }
    }

    func testAzureCosts_ReturnsData() async throws {
        let records = try await apiClient.fetchAllCostRecords(tenantId: nil, dateFrom: nil, dateTo: nil)

        print("Azure Cost Records: \(records.count) found")

        if records.isEmpty {
            print("  ⚠️ WARNING: No cost records - Cost screens will show no data")
        } else {
            let totalCost = records.reduce(Decimal(0)) { $0 + $1.costAmount }
            print("  - Total cost: \(totalCost)")
        }
    }

    // MARK: - SQL Database Tests

    func testSQLDatabases_HasPerformanceStats() async throws {
        let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())

        print("SQL Databases: \(databases.count) found")

        guard !databases.isEmpty else {
            print("  ⚠️ No databases found")
            return
        }

        // Check for latest_stats field
        let hasLatestStats = databases.contains { $0.latestStats != nil }
        let hasCpuPercent = databases.contains { $0.latestStats?.cpuPercent != nil }
        let hasDtuPercent = databases.contains { $0.latestStats?.dtuPercent != nil }
        let hasStoragePercent = databases.contains { $0.latestStats?.storagePercent != nil }
        let hasOptimizationScore = databases.contains { $0.optimizationScore != nil }

        print("  - Has latest_stats: \(hasLatestStats)")
        print("  - Has CPU percent: \(hasCpuPercent)")
        print("  - Has DTU percent: \(hasDtuPercent)")
        print("  - Has storage percent: \(hasStoragePercent)")
        print("  - Has optimization score: \(hasOptimizationScore)")

        // These are critical for UI display
        if !hasLatestStats {
            XCTFail("❌ CRITICAL: API does not return 'latest_stats' - SQL overview will show '--' for all stats")
        }
        if !hasCpuPercent && !hasDtuPercent && !hasStoragePercent {
            XCTFail("❌ CRITICAL: No performance metrics available - SQL overview cards will show 0%")
        }
    }

    func testSQLDatabaseDetail_HasExpectedFields() async throws {
        let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())

        guard let firstDb = databases.first else {
            print("No databases to test detail view")
            return
        }

        let detail: [SQLDatabase] = try await apiClient.request(.sqlDatabase(id: firstDb.id))

        guard let db = detail.first else {
            XCTFail("Database detail returned empty array")
            return
        }

        print("SQL Database Detail for '\(db.name)':")
        print("  - Resource type: \(db.resourceType ?? "nil")")
        print("  - Location: \(db.location ?? "nil")")
        print("  - Tenant: \(db.azureTenants?.name ?? "nil")")
    }

    func testSQLPerformance_ReturnsData() async throws {
        let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())

        guard let firstDb = databases.first else {
            print("No databases to test performance")
            return
        }

        let performance: SQLPerformanceStats? = try await apiClient.requestOptional(.sqlPerformance(resourceId: firstDb.id))

        print("SQL Performance for '\(firstDb.name)':")

        if let perf = performance {
            print("  - CPU: \(perf.cpuPercent ?? 0)%")
            print("  - DTU: \(perf.dtuPercent ?? 0)%")
            print("  - Storage: \(perf.storagePercent ?? 0)%")
            print("  - Connections: \(perf.connectionCount ?? 0)")
        } else {
            print("  ⚠️ No performance data available")
        }
    }

    // MARK: - Alerts Tests

    func testAlerts_ChecksForData() async throws {
        let alerts: [Alert] = try await apiClient.requestArrayOrEmpty(.alerts())

        print("Alerts: \(alerts.count) found")

        if alerts.isEmpty {
            print("  ⚠️ WARNING: No alerts in system - Alerts tab will be empty")
            print("  This may be expected if there are no active alerts")
        } else {
            for alert in alerts.prefix(5) {
                print("  - \(alert.title): \(alert.severity.rawValue)")
            }
        }
    }

    func testAlertRules_ChecksForData() async throws {
        let rules: [AlertRule] = try await apiClient.requestArrayOrEmpty(.alertRules)

        print("Alert Rules: \(rules.count) found")

        if rules.isEmpty {
            print("  ⚠️ WARNING: No alert rules configured")
        } else {
            for rule in rules.prefix(5) {
                print("  - \(rule.name): \(rule.isEnabled ? "enabled" : "disabled")")
            }
        }
    }

    // MARK: - Users Tests

    func testUsers_HasRoleField() async throws {
        let users: [User] = try await apiClient.requestArrayOrEmpty(.users)

        print("Users: \(users.count) found")

        guard let firstUser = users.first else {
            print("  ⚠️ No users found")
            return
        }

        print("  Sample user: \(firstUser.displayName)")
        print("  - Roles: \(firstUser.roles.map { $0.rawValue }.joined(separator: ", "))")
        print("  - Primary Role: \(firstUser.primaryRole ?? "nil")")

        let hasRoles = users.contains { !$0.roles.isEmpty }
        if !hasRoles {
            print("  ⚠️ WARNING: No users have roles - User management will show incorrect role info")
        }
    }

    // MARK: - Clients Tests

    func testClients_ReturnsData() async throws {
        let clients: [Client] = try await apiClient.requestArrayOrEmpty(.clients())

        print("Clients: \(clients.count) found")

        if clients.isEmpty {
            print("  ⚠️ WARNING: No clients - Clients tab will be empty")
        } else {
            for client in clients.prefix(5) {
                print("  - \(client.name)")
            }
        }
    }

    // MARK: - Resources Tests

    func testResources_ReturnsData() async throws {
        let resources: [Resource] = try await apiClient.requestArrayOrEmpty(.resources(clientId: nil))

        print("Internal Resources: \(resources.count) found")

        if resources.isEmpty {
            print("  ⚠️ WARNING: No internal resources - Resources tab may be empty")
        } else {
            for resource in resources.prefix(5) {
                print("  - \(resource.name): \(resource.status.rawValue)")
            }
        }
    }

    // MARK: - Alert Templates Tests

    func testAlertTemplates_ReturnsData() async throws {
        // Use raw request since we don't have a model yet
        let endpoint = APIEndpoint.alertTemplates()
        let baseURL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
        let url = endpoint.url(baseURL: baseURL)

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // Use X-API-Key header like the APIClient does
        request.setValue(Self.testAPIKey, forHTTPHeaderField: "X-API-Key")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            XCTFail("Invalid response type")
            return
        }

        print("Alert Templates Response Status: \(httpResponse.statusCode)")
        if let bodyString = String(data: data, encoding: .utf8)?.prefix(500) {
            print("Alert Templates Response Body: \(bodyString)")
        }

        if httpResponse.statusCode == 200 {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let dataArray = json["data"] as? [[String: Any]] {
                print("Alert Templates: \(dataArray.count) found")
                for template in dataArray.prefix(5) {
                    let name = template["name"] as? String ?? "Unknown"
                    let category = template["category"] as? String ?? "unknown"
                    let ruleType = template["rule_type"] as? String ?? "unknown"
                    print("  - \(name) [\(category)] (\(ruleType))")
                }
                XCTAssertGreaterThan(dataArray.count, 0, "Should have at least one alert template")
            }
        } else {
            XCTFail("Alert templates endpoint returned: \(httpResponse.statusCode)")
        }
    }

    // MARK: - New Endpoints Tests

    func testNotificationChannels_ReturnsData() async throws {
        let endpoint = APIEndpoint.notificationChannels()
        let baseURL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
        let url = endpoint.url(baseURL: baseURL)

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Self.testAPIKey, forHTTPHeaderField: "X-API-Key")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            XCTFail("Invalid response type")
            return
        }

        print("Notification Channels Response Status: \(httpResponse.statusCode)")

        if httpResponse.statusCode == 200 {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let dataArray = json["data"] as? [[String: Any]] {
                print("Notification Channels: \(dataArray.count) found")
                for channel in dataArray.prefix(5) {
                    let name = channel["name"] as? String ?? "Unknown"
                    let channelType = channel["channel_type"] as? String ?? "unknown"
                    let isEnabled = channel["is_enabled"] as? Bool ?? false
                    print("  - \(name) [\(channelType)] (enabled: \(isEnabled))")
                }
            }
        } else {
            print("  ⚠️ Notification channels endpoint returned: \(httpResponse.statusCode)")
        }
    }

    func testAzureIdleResources_ReturnsData() async throws {
        let endpoint = APIEndpoint.azureIdleResources()
        let baseURL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
        let url = endpoint.url(baseURL: baseURL)

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Self.testAPIKey, forHTTPHeaderField: "X-API-Key")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            XCTFail("Invalid response type")
            return
        }

        print("Azure Idle Resources Response Status: \(httpResponse.statusCode)")

        if httpResponse.statusCode == 200 {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let dataArray = json["data"] as? [[String: Any]] {
                print("Azure Idle Resources: \(dataArray.count) found")
                for resource in dataArray.prefix(5) {
                    let name = resource["name"] as? String ?? "Unknown"
                    let savings = resource["potential_annual_savings"] as? Double ?? 0
                    print("  - \(name) (potential savings: $\(String(format: "%.2f", savings)))")
                }
            }
        } else {
            print("  ⚠️ Azure idle resources endpoint returned: \(httpResponse.statusCode)")
        }
    }

    func testAzureSyncProgress_ReturnsData() async throws {
        let endpoint = APIEndpoint.azureSyncProgressActive
        let baseURL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
        let url = endpoint.url(baseURL: baseURL)

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Self.testAPIKey, forHTTPHeaderField: "X-API-Key")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            XCTFail("Invalid response type")
            return
        }

        print("Azure Sync Progress Response Status: \(httpResponse.statusCode)")

        if httpResponse.statusCode == 200 {
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                print("Azure Sync Progress: \(json)")
            }
        } else {
            print("  ⚠️ Azure sync progress endpoint returned: \(httpResponse.statusCode)")
        }
    }

    // MARK: - Incidents Tests

    func testIncidents_ReturnsData() async throws {
        let incidents: [Incident] = try await apiClient.requestArrayOrEmpty(.incidents())

        print("Incidents: \(incidents.count) found")

        if incidents.isEmpty {
            print("  ⚠️ No incidents - this may be expected")
        } else {
            for incident in incidents.prefix(5) {
                print("  - \(incident.title): \(incident.status.rawValue)")
            }
        }
    }

    // MARK: - Full Regression Report

    func testFullRegressionReport() async throws {
        print("\n" + String(repeating: "=", count: 60))
        print("FULL REGRESSION TEST REPORT")
        print(String(repeating: "=", count: 60))

        var issues: [String] = []

        // Dashboard
        do {
            let summary: DashboardSummary = try await apiClient.request(.dashboardSummary)
            print("✅ Dashboard: \(summary.resourcesCount) resources, \(summary.clientsCount) clients")
        } catch {
            issues.append("❌ Dashboard failed: \(error)")
        }

        // Azure Tenants
        do {
            let tenants: [AzureTenant] = try await apiClient.request(.azureTenants)
            print("✅ Azure Tenants: \(tenants.count)")
        } catch {
            issues.append("❌ Azure Tenants failed: \(error)")
        }

        // Azure Resources
        do {
            let resources: [AzureResource] = try await apiClient.request(.azureResources())
            print("✅ Azure Resources: \(resources.count)")
        } catch {
            issues.append("❌ Azure Resources failed: \(error)")
        }

        // SQL Databases with stats check
        do {
            let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())
            let hasStats = databases.contains { $0.latestStats != nil }
            if hasStats {
                print("✅ SQL Databases: \(databases.count) with stats")
            } else {
                print("⚠️ SQL Databases: \(databases.count) but NO STATS - UI will show '--'")
                issues.append("⚠️ SQL databases missing latest_stats")
            }
        } catch {
            issues.append("❌ SQL Databases failed: \(error)")
        }

        // Alerts
        do {
            let alerts: [Alert] = try await apiClient.requestArrayOrEmpty(.alerts())
            print("✅ Alerts: \(alerts.count)")
        } catch {
            issues.append("❌ Alerts failed: \(error)")
        }

        // Users with role check
        do {
            let users: [User] = try await apiClient.requestArrayOrEmpty(.users)
            let hasRoles = users.contains { !$0.roles.isEmpty }
            if hasRoles {
                print("✅ Users: \(users.count) with roles")
            } else {
                print("⚠️ Users: \(users.count) but NO ROLES - UI will show incorrect roles")
                issues.append("⚠️ Users missing role field")
            }
        } catch {
            issues.append("❌ Users failed: \(error)")
        }

        // Clients
        do {
            let clients: [Client] = try await apiClient.requestArrayOrEmpty(.clients())
            print("✅ Clients: \(clients.count)")
        } catch {
            issues.append("❌ Clients failed: \(error)")
        }

        // Resources
        do {
            let resources: [Resource] = try await apiClient.requestArrayOrEmpty(.resources(clientId: nil))
            print("✅ Resources: \(resources.count)")
        } catch {
            issues.append("❌ Resources failed: \(error)")
        }

        print(String(repeating: "-", count: 60))

        if issues.isEmpty {
            print("🎉 ALL CHECKS PASSED")
        } else {
            print("ISSUES FOUND (\(issues.count)):")
            for issue in issues {
                print("  \(issue)")
            }
            XCTFail("Regression test found \(issues.count) issues")
        }

        print(String(repeating: "=", count: 60) + "\n")
    }
}
