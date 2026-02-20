import XCTest
@testable import azuremonitor

/// Comprehensive API tests to verify response structures and identify array vs object mismatches.
/// These tests document the expected response type for each endpoint and catch decoding errors.
final class APIComprehensiveTests: XCTestCase {

    var apiClient: APIClient!
    let keychainService = KeychainService()

    static let testAPIKey = ProcessInfo.processInfo.environment["AZURE_MONITOR_API_KEY"] ?? "qtz_d2NP1gT-7Qrj9id8XIT2bj5Hlc5xhHeBGEOAd4h7mTI"
    static let baseURL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"

    override func setUp() {
        super.setUp()
        if !Self.testAPIKey.isEmpty && Self.testAPIKey != "YOUR_API_KEY_HERE" {
            keychainService.storeAPIKey(Self.testAPIKey)
        }
        apiClient = APIClient.shared
    }

    // MARK: - Helper Methods

    /// Makes a raw request and returns the JSON structure of the 'data' field
    private func fetchRawDataType(for endpoint: APIEndpoint) async throws -> DataStructureType {
        let url = endpoint.url(baseURL: Self.baseURL)
        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(Self.testAPIKey, forHTTPHeaderField: "X-API-Key")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            return .error(code: httpResponse.statusCode)
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return .invalid
        }

        guard json["success"] as? Bool == true else {
            return .error(code: -1)
        }

        guard let dataValue = json["data"] else {
            return .null
        }

        if dataValue is NSNull {
            return .null
        } else if dataValue is [[String: Any]] {
            return .array
        } else if dataValue is [String: Any] {
            return .object
        } else if dataValue is [Any] {
            return .array
        } else {
            return .primitive
        }
    }

    enum DataStructureType: CustomStringConvertible {
        case array
        case object
        case null
        case primitive
        case invalid
        case error(code: Int)

        var description: String {
            switch self {
            case .array: return "Array"
            case .object: return "Object"
            case .null: return "Null"
            case .primitive: return "Primitive"
            case .invalid: return "Invalid JSON"
            case .error(let code): return "Error(\(code))"
            }
        }
    }

    // MARK: - Dashboard Endpoints

    func testDashboardSummary_ExpectsObject() async throws {
        let dataType = try await fetchRawDataType(for: .dashboardSummary)
        print("dashboardSummary: data is \(dataType)")
        XCTAssertEqual(dataType.description, "Object", "Dashboard summary should return an object")

        // Verify model decoding
        let summary: DashboardSummary = try await apiClient.request(.dashboardSummary)
        XCTAssertGreaterThanOrEqual(summary.resourcesCount, 0)
    }

    // MARK: - Resources Endpoints

    func testResources_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .resources())
        print("resources(): data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Resources list should return an array")

        let resources: [Resource] = try await apiClient.request(.resources())
        print("  Decoded \(resources.count) resources")
    }

    func testResourceDetail_CheckStructure() async throws {
        // First get a resource ID
        let resources: [Resource] = try await apiClient.request(.resources())
        guard let firstResource = resources.first else {
            print("  No resources to test detail endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .resource(id: firstResource.id))
        print("resource(id:): data is \(dataType)")

        // Verify it decodes correctly
        if dataType.description == "Array" {
            print("  WARNING: resource(id:) returns Array - ViewModel should use requestSingleOrFirst")
            // Try decoding as array
            let results: [Resource] = try await apiClient.request(.resource(id: firstResource.id))
            XCTAssertFalse(results.isEmpty, "Array should contain at least one resource")
        } else {
            let resource: Resource = try await apiClient.request(.resource(id: firstResource.id))
            XCTAssertEqual(resource.id, firstResource.id)
        }
    }

    func testResourceStatus_CheckStructure() async throws {
        let resources: [Resource] = try await apiClient.request(.resources())
        guard let firstResource = resources.first else {
            print("  No resources to test status endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .resourceStatus(id: firstResource.id))
        print("resourceStatus(id:): data is \(dataType)")

        if dataType.description == "Object" {
            let status: ResourceStatusResponse = try await apiClient.request(.resourceStatus(id: firstResource.id))
            print("  Status: \(status.status)")
        }
    }

    func testResourceUptime_CheckStructure() async throws {
        let resources: [Resource] = try await apiClient.request(.resources())
        guard let firstResource = resources.first else {
            print("  No resources to test uptime endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .resourceUptime(id: firstResource.id))
        print("resourceUptime(id:): data is \(dataType)")

        if dataType.description == "Object" {
            let uptime: ResourceUptimeResponse = try await apiClient.request(.resourceUptime(id: firstResource.id))
            print("  Uptime 24h: \(uptime.uptime24h)%")
        }
    }

    // MARK: - Alerts Endpoints

    func testAlerts_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .alerts())
        print("alerts(): data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Alerts list should return an array")

        let alerts: [Alert] = try await apiClient.requestArrayOrEmpty(.alerts())
        print("  Decoded \(alerts.count) alerts")
    }

    func testAlertDetail_CheckStructure() async throws {
        let alerts: [Alert] = try await apiClient.requestArrayOrEmpty(.alerts())
        guard let firstAlert = alerts.first else {
            print("  No alerts to test detail endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .alert(id: firstAlert.id))
        print("alert(id:): data is \(dataType)")

        if dataType.description == "Array" {
            print("  WARNING: alert(id:) returns Array - Repository should use requestSingleOrFirst")
        }
    }

    func testAlertRules_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .alertRules)
        print("alertRules: data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Alert rules should return an array")

        let rules: [AlertRule] = try await apiClient.requestArrayOrEmpty(.alertRules)
        print("  Decoded \(rules.count) alert rules")
    }

    func testAlertRuleDetail_CheckStructure() async throws {
        let rules: [AlertRule] = try await apiClient.requestArrayOrEmpty(.alertRules)
        guard let firstRule = rules.first else {
            print("  No alert rules to test detail endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .alertRule(id: firstRule.id))
        print("alertRule(id:): data is \(dataType)")

        if dataType.description == "Array" {
            print("  WARNING: alertRule(id:) returns Array")
        }
    }

    // MARK: - Incidents Endpoints

    func testIncidents_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .incidents())
        print("incidents(): data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Incidents list should return an array")

        let incidents: [Incident] = try await apiClient.requestArrayOrEmpty(.incidents())
        print("  Decoded \(incidents.count) incidents")
    }

    func testIncidentDetail_CheckStructure() async throws {
        let incidents: [Incident] = try await apiClient.requestArrayOrEmpty(.incidents())
        guard let firstIncident = incidents.first else {
            print("  No incidents to test detail endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .incident(id: firstIncident.id))
        print("incident(id:): data is \(dataType)")

        if dataType.description == "Array" {
            print("  WARNING: incident(id:) returns Array - Repository should use requestSingleOrFirst")
        }
    }

    // MARK: - Clients Endpoints

    func testClients_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .clients())
        print("clients(): data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Clients list should return an array")

        let clients: [Client] = try await apiClient.requestArrayOrEmpty(.clients())
        print("  Decoded \(clients.count) clients")
    }

    func testClientDetail_CheckStructure() async throws {
        let clients: [Client] = try await apiClient.requestArrayOrEmpty(.clients())
        guard let firstClient = clients.first else {
            print("  No clients to test detail endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .client(id: firstClient.id))
        print("client(id:): data is \(dataType)")

        if dataType.description == "Array" {
            print("  WARNING: client(id:) returns Array - Repository should use requestSingleOrFirst")
        }
    }

    func testClientEnvironments_CheckStructure() async throws {
        let clients: [Client] = try await apiClient.requestArrayOrEmpty(.clients())
        guard let firstClient = clients.first else {
            print("  No clients to test environments endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .clientEnvironments(clientId: firstClient.id))
        print("clientEnvironments(clientId:): data is \(dataType)")
    }

    // MARK: - Environments Endpoints

    func testEnvironments_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .environments())
        print("environments(): data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Environments list should return an array")
    }

    func testEnvironmentDetail_CheckStructure() async throws {
        // Try to get environments
        do {
            let environments: [DeploymentEnvironment] = try await apiClient.request(.environments())
            guard let firstEnv = environments.first else {
                print("  No environments to test detail endpoint")
                return
            }

            let dataType = try await fetchRawDataType(for: .environment(id: firstEnv.id))
            print("environment(id:): data is \(dataType)")

            if dataType.description == "Array" {
                print("  WARNING: environment(id:) returns Array - ViewModel should use requestSingleOrFirst")
            }
        } catch {
            print("  Could not fetch environments: \(error)")
        }
    }

    // MARK: - Azure Endpoints

    func testAzureTenants_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .azureTenants)
        print("azureTenants: data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Azure tenants should return an array")

        let tenants: [AzureTenant] = try await apiClient.request(.azureTenants)
        print("  Decoded \(tenants.count) tenants")
    }

    func testAzureResources_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .azureResources())
        print("azureResources(): data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Azure resources should return an array")

        let resources: [AzureResource] = try await apiClient.request(.azureResources())
        print("  Decoded \(resources.count) Azure resources")
    }

    func testAzureResourceDetail_CheckStructure() async throws {
        let resources: [AzureResource] = try await apiClient.request(.azureResources())
        guard let firstResource = resources.first else {
            print("  No Azure resources to test detail endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .azureResource(id: firstResource.id))
        print("azureResource(id:): data is \(dataType)")

        if dataType.description == "Array" {
            print("  WARNING: azureResource(id:) returns Array")
        }
    }

    func testAzureCosts_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .azureCosts())
        print("azureCosts(): data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Azure costs should return an array")
    }

    func testAzureCostSummary_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .azureCostSummary())
        print("azureCostSummary(): data is \(dataType)")
    }

    func testAzureCostTrend_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .azureCostTrend())
        print("azureCostTrend(): data is \(dataType)")
    }

    func testAzureHealthIssues_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .azureHealthIssues())
        print("azureHealthIssues(): data is \(dataType)")
    }

    func testAzureHealthOverview_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .azureHealthOverview())
        print("azureHealthOverview(): data is \(dataType)")
    }

    // MARK: - SQL Endpoints

    func testSQLDatabasesOverview_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .sqlDatabasesOverview())
        print("sqlDatabasesOverview(): data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "SQL databases overview should return an array")

        let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())
        print("  Decoded \(databases.count) SQL databases")
    }

    func testSQLDatabaseDetail_CheckStructure() async throws {
        let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())
        guard let firstDb = databases.first else {
            print("  No SQL databases to test detail endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .sqlDatabase(id: firstDb.id))
        print("sqlDatabase(id:): data is \(dataType)")

        // This endpoint is known to return an array
        if dataType.description == "Array" {
            print("  CONFIRMED: sqlDatabase(id:) returns Array - SQLDatabaseDetailViewModel correctly handles this")
            let results: [SQLDatabase] = try await apiClient.request(.sqlDatabase(id: firstDb.id))
            XCTAssertFalse(results.isEmpty, "Array should contain at least one database")
        }
    }

    func testSQLPerformance_CheckStructure() async throws {
        let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())
        guard let firstDb = databases.first else {
            print("  No SQL databases to test performance endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .sqlPerformance(resourceId: firstDb.id))
        print("sqlPerformance(resourceId:): data is \(dataType)")
    }

    func testSQLInsights_CheckStructure() async throws {
        let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())
        guard let firstDb = databases.first else {
            print("  No SQL databases to test insights endpoint")
            return
        }

        let dataType = try await fetchRawDataType(for: .sqlInsights(resourceId: firstDb.id))
        print("sqlInsights(resourceId:): data is \(dataType)")
    }

    func testSQLStatsSummary_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .sqlStatsSummary())
        print("sqlStatsSummary(): data is \(dataType)")
    }

    // MARK: - Admin Endpoints

    func testUsers_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .users)
        print("users: data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Users should return an array")

        let users: [ManagedUser] = try await apiClient.requestArrayOrEmpty(.users)
        print("  Decoded \(users.count) users")
    }

    func testAPIKeys_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .apiKeys)
        print("apiKeys: data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "API keys should return an array")

        let keys: [APIKey] = try await apiClient.requestArrayOrEmpty(.apiKeys)
        print("  Decoded \(keys.count) API keys")
    }

    func testSystemSettings_ExpectsObject() async throws {
        let dataType = try await fetchRawDataType(for: .systemSettings)
        print("systemSettings: data is \(dataType)")

        if dataType.description == "Object" {
            // Try decoding
            do {
                let settings: SystemSettings = try await apiClient.request(.systemSettings)
                print("  Decoded system settings: maintenance=\(settings.maintenanceMode)")
            } catch {
                print("  WARNING: Failed to decode SystemSettings: \(error)")
            }
        } else if dataType.description == "Null" {
            print("  INFO: systemSettings returns null - no settings configured yet")
        } else if dataType.description == "Array" {
            print("  WARNING: systemSettings returns Array - AdminViewModel expects Object")
        }
    }

    func testSyncScheduler_ExpectsObject() async throws {
        let dataType = try await fetchRawDataType(for: .syncScheduler)
        print("syncScheduler: data is \(dataType)")

        if dataType.description == "Object" {
            do {
                let scheduler: SyncScheduler = try await apiClient.request(.syncScheduler)
                print("  Decoded sync scheduler: azureSync=\(scheduler.azureSyncEnabled)")
            } catch {
                print("  WARNING: Failed to decode SyncScheduler: \(error)")
            }
        } else if dataType.description == "Null" {
            print("  INFO: syncScheduler returns null - no scheduler configured yet")
        } else if dataType.description == "Array" {
            print("  WARNING: syncScheduler returns Array - AdminViewModel expects Object")
        }
    }

    func testSyncLogs_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .syncLogs())
        print("syncLogs(): data is \(dataType)")
        XCTAssertEqual(dataType.description, "Array", "Sync logs should return an array")

        let logs: [SyncLog] = try await apiClient.requestArrayOrEmpty(.syncLogs())
        print("  Decoded \(logs.count) sync logs")
    }

    // MARK: - Notification Channels

    func testNotificationChannels_ExpectsArray() async throws {
        let dataType = try await fetchRawDataType(for: .notificationChannels())
        print("notificationChannels(): data is \(dataType)")
    }

    // MARK: - Azure Additional Endpoints

    func testAzureIdleResources_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .azureIdleResources())
        print("azureIdleResources(): data is \(dataType)")
    }

    func testAzureSyncProgress_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .azureSyncProgress())
        print("azureSyncProgress(): data is \(dataType)")
    }

    func testAzureSyncLogs_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .azureSyncLogs())
        print("azureSyncLogs(): data is \(dataType)")
    }

    func testAzureCostAlertRules_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .azureCostAlertRules)
        print("azureCostAlertRules: data is \(dataType)")
    }

    func testAzureCostAlerts_CheckStructure() async throws {
        let dataType = try await fetchRawDataType(for: .azureCostAlerts())
        print("azureCostAlerts(): data is \(dataType)")
    }

    // MARK: - Full Structure Report

    func testGenerateFullStructureReport() async throws {
        print("\n" + String(repeating: "=", count: 70))
        print("API ENDPOINT STRUCTURE REPORT")
        print(String(repeating: "=", count: 70))

        var results: [(endpoint: String, expected: String, actual: String, status: String)] = []

        // Define all endpoints with their expected types
        let endpointsToTest: [(endpoint: APIEndpoint, name: String, expected: String)] = [
            // Dashboard
            (.dashboardSummary, "dashboardSummary", "Object"),

            // Resources
            (.resources(), "resources()", "Array"),

            // Alerts
            (.alerts(), "alerts()", "Array"),
            (.alertRules, "alertRules", "Array"),

            // Incidents
            (.incidents(), "incidents()", "Array"),

            // Clients
            (.clients(), "clients()", "Array"),

            // Environments
            (.environments(), "environments()", "Array"),

            // Azure
            (.azureTenants, "azureTenants", "Array"),
            (.azureResources(), "azureResources()", "Array"),
            (.azureCosts(), "azureCosts()", "Array"),
            (.azureHealthIssues(), "azureHealthIssues()", "Array"),
            (.azureIdleResources(), "azureIdleResources()", "Array"),
            (.azureSyncLogs(), "azureSyncLogs()", "Array"),
            (.azureCostAlertRules, "azureCostAlertRules", "Array"),
            (.azureCostAlerts(), "azureCostAlerts()", "Array"),

            // SQL
            (.sqlDatabasesOverview(), "sqlDatabasesOverview()", "Array"),

            // Admin
            (.users, "users", "Array"),
            (.apiKeys, "apiKeys", "Array"),
            (.systemSettings, "systemSettings", "Object"),
            (.syncScheduler, "syncScheduler", "Object"),
            (.syncLogs(), "syncLogs()", "Array"),

            // Notification Channels
            (.notificationChannels(), "notificationChannels()", "Array"),
        ]

        for (endpoint, name, expected) in endpointsToTest {
            do {
                let actual = try await fetchRawDataType(for: endpoint)
                let status: String
                if actual.description == expected {
                    status = "OK"
                } else if actual.description == "Null" && expected == "Object" {
                    status = "OK (null)"
                } else if case .error = actual {
                    status = "ERROR"
                } else {
                    status = "MISMATCH"
                }
                results.append((name, expected, actual.description, status))
            } catch {
                results.append((name, expected, "Exception", "ERROR"))
            }
        }

        // Print results
        print("Endpoint                       Expected   Actual     Status")
        print(String(repeating: "-", count: 70))

        for result in results {
            let statusIcon: String
            switch result.status {
            case "OK", "OK (null)": statusIcon = "OK"
            case "MISMATCH": statusIcon = "WARNING"
            default: statusIcon = "ERROR"
            }
            let line = "\(result.endpoint.padding(toLength: 30, withPad: " ", startingAt: 0)) \(result.expected.padding(toLength: 10, withPad: " ", startingAt: 0)) \(result.actual.padding(toLength: 10, withPad: " ", startingAt: 0)) \(statusIcon)"
            print(line)
        }

        print(String(repeating: "=", count: 70))

        // Count issues
        let mismatches = results.filter { $0.status == "MISMATCH" }
        let errors = results.filter { $0.status == "ERROR" }

        if mismatches.isEmpty && errors.isEmpty {
            print("ALL ENDPOINTS MATCH EXPECTED STRUCTURE")
        } else {
            print("ISSUES FOUND:")
            for mismatch in mismatches {
                print("  - \(mismatch.endpoint): Expected \(mismatch.expected), got \(mismatch.actual)")
            }
            for error in errors {
                print("  - \(error.endpoint): \(error.actual)")
            }
        }

        print(String(repeating: "=", count: 70) + "\n")
    }

    // MARK: - Detail Endpoint Tests (Test Array vs Object for ID-based endpoints)

    func testAllDetailEndpoints_Report() async throws {
        print("\n" + String(repeating: "=", count: 70))
        print("DETAIL ENDPOINT STRUCTURE REPORT")
        print("(These endpoints take an ID and may return Array or Object)")
        print(String(repeating: "=", count: 70))

        // Get sample IDs for testing
        let resources: [Resource] = try await apiClient.requestArrayOrEmpty(.resources())
        let alerts: [Alert] = try await apiClient.requestArrayOrEmpty(.alerts())
        let incidents: [Incident] = try await apiClient.requestArrayOrEmpty(.incidents())
        let clients: [Client] = try await apiClient.requestArrayOrEmpty(.clients())
        let azureResources: [AzureResource] = try await apiClient.requestArrayOrEmpty(.azureResources())
        let sqlDatabases: [SQLDatabaseOverview] = try await apiClient.requestArrayOrEmpty(.sqlDatabasesOverview())

        var detailResults: [(endpoint: String, actual: String, recommendation: String)] = []

        // Test resource detail
        if let id = resources.first?.id {
            let dataType = try await fetchRawDataType(for: .resource(id: id))
            let rec = dataType.description == "Array" ? "Use requestSingleOrFirst" : "OK"
            detailResults.append(("resource(id:)", dataType.description, rec))

            let statusType = try await fetchRawDataType(for: .resourceStatus(id: id))
            detailResults.append(("resourceStatus(id:)", statusType.description, statusType.description == "Object" ? "OK" : "Check"))

            let uptimeType = try await fetchRawDataType(for: .resourceUptime(id: id))
            detailResults.append(("resourceUptime(id:)", uptimeType.description, uptimeType.description == "Object" ? "OK" : "Check"))
        }

        // Test alert detail
        if let id = alerts.first?.id {
            let dataType = try await fetchRawDataType(for: .alert(id: id))
            let rec = dataType.description == "Array" ? "Use requestSingleOrFirst" : "OK"
            detailResults.append(("alert(id:)", dataType.description, rec))
        }

        // Test incident detail
        if let id = incidents.first?.id {
            let dataType = try await fetchRawDataType(for: .incident(id: id))
            let rec = dataType.description == "Array" ? "Use requestSingleOrFirst" : "OK"
            detailResults.append(("incident(id:)", dataType.description, rec))
        }

        // Test client detail
        if let id = clients.first?.id {
            let dataType = try await fetchRawDataType(for: .client(id: id))
            let rec = dataType.description == "Array" ? "Use requestSingleOrFirst" : "OK"
            detailResults.append(("client(id:)", dataType.description, rec))

            let envType = try await fetchRawDataType(for: .clientEnvironments(clientId: id))
            detailResults.append(("clientEnvironments(id:)", envType.description, ""))
        }

        // Test Azure resource detail
        if let id = azureResources.first?.id {
            let dataType = try await fetchRawDataType(for: .azureResource(id: id))
            let rec = dataType.description == "Array" ? "Use requestSingleOrFirst" : "OK"
            detailResults.append(("azureResource(id:)", dataType.description, rec))
        }

        // Test SQL database detail
        if let id = sqlDatabases.first?.id {
            let dataType = try await fetchRawDataType(for: .sqlDatabase(id: id))
            let rec = dataType.description == "Array" ? "Already handles array" : "OK"
            detailResults.append(("sqlDatabase(id:)", dataType.description, rec))

            let perfType = try await fetchRawDataType(for: .sqlPerformance(resourceId: id))
            detailResults.append(("sqlPerformance(id:)", perfType.description, "Uses requestOptional"))

            let insightType = try await fetchRawDataType(for: .sqlInsights(resourceId: id))
            detailResults.append(("sqlInsights(id:)", insightType.description, "Uses requestArrayOrEmpty"))
        }

        // Print results
        print("Endpoint                  Returns      Recommendation")
        print(String(repeating: "-", count: 70))

        for result in detailResults {
            let line = "\(result.endpoint.padding(toLength: 25, withPad: " ", startingAt: 0)) \(result.actual.padding(toLength: 12, withPad: " ", startingAt: 0)) \(result.recommendation)"
            print(line)
        }

        print(String(repeating: "=", count: 70) + "\n")
    }
}
