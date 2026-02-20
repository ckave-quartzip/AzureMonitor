import XCTest
@testable import azuremonitor

/// Tests to validate API endpoints and response structures
/// Run these tests to catch API mismatches before they become runtime issues
final class APIEndpointTests: XCTestCase {

    var apiClient: APIClient!
    let keychainService = KeychainService()

    // ⚠️ Test API key - use environment variable in CI/CD
    static let testAPIKey = ProcessInfo.processInfo.environment["AZURE_MONITOR_API_KEY"] ?? "qtz_d2NP1gT-7Qrj9id8XIT2bj5Hlc5xhHeBGEOAd4h7mTI"

    override func setUp() {
        super.setUp()

        // Inject API key for tests
        if !Self.testAPIKey.isEmpty && Self.testAPIKey != "YOUR_API_KEY_HERE" {
            keychainService.storeAPIKey(Self.testAPIKey)
        }

        apiClient = APIClient.shared
    }

    override func tearDown() {
        super.tearDown()
        // Optionally clear the key after tests
        // keychainService.deleteAPIKey()
    }

    // MARK: - Azure Endpoints

    func testAzureTenantsEndpoint() async throws {
        do {
            let tenants: [AzureTenant] = try await apiClient.request(.azureTenants)
            XCTAssertNotNil(tenants, "Tenants should not be nil")
            print("Loaded \(tenants.count) tenants")
        } catch {
            XCTFail("Failed to load tenants: \(error)")
        }
    }

    func testAzureResourcesEndpoint() async throws {
        do {
            let resources: [AzureResource] = try await apiClient.request(.azureResources())
            XCTAssertNotNil(resources, "Resources should not be nil")
            print("Loaded \(resources.count) resources")

            // Validate first resource structure if available
            if let resource = resources.first {
                XCTAssertNotNil(resource.id, "Resource ID should not be nil")
                XCTAssertFalse(resource.name.isEmpty, "Resource name should not be empty")
                XCTAssertFalse(resource.resourceType.isEmpty, "Resource type should not be empty")
                print("Sample resource: \(resource.name) (\(resource.resourceType))")
            }
        } catch {
            XCTFail("Failed to load resources: \(error)")
        }
    }

    func testAzureCostsEndpoint() async throws {
        do {
            // Cost data is loaded via fetchAllCostRecords and aggregated client-side
            let records = try await apiClient.fetchAllCostRecords(tenantId: nil, dateFrom: nil, dateTo: nil)
            print("Loaded \(records.count) cost records")

            if !records.isEmpty {
                let summary = AzureCostSummary.from(records: records)
                print("Total cost: \(summary.totalCost)")
            }
        } catch {
            XCTFail("Failed to load cost records: \(error)")
        }
    }

    // MARK: - SQL Endpoints

    func testSQLDatabasesOverviewEndpoint() async throws {
        do {
            let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())
            print("Loaded \(databases.count) SQL databases")

            // Validate structure
            for db in databases {
                XCTAssertNotNil(db.id, "Database ID should not be nil")
                XCTAssertFalse(db.name.isEmpty, "Database name should not be empty")
                print("  - \(db.name): CPU=\(db.latestStats?.cpuPercent ?? 0)%, Storage=\(db.latestStats?.storagePercent ?? 0)%")
            }
        } catch {
            XCTFail("Failed to load SQL databases overview: \(error)")
        }
    }

    func testSQLStatsComputedFromDatabases() async throws {
        // Stats summary is computed client-side from databases overview
        // This test verifies the databases endpoint returns data we can compute stats from
        do {
            let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())

            // Compute stats client-side (same as SQLOverviewViewModel)
            let cpuValues = databases.compactMap { $0.latestStats?.cpuPercent }
            let storageValues = databases.compactMap { $0.latestStats?.storagePercent }

            print("Total databases: \(databases.count)")
            if !cpuValues.isEmpty {
                let avgCpu = cpuValues.reduce(0, +) / Double(cpuValues.count)
                print("Avg CPU: \(avgCpu)%")
            }
            if !storageValues.isEmpty {
                let avgStorage = storageValues.reduce(0, +) / Double(storageValues.count)
                print("Avg Storage: \(avgStorage)%")
            }

            XCTAssertGreaterThan(databases.count, 0, "Should have at least one database")
        } catch {
            XCTFail("Failed to load SQL databases for stats: \(error)")
        }
    }

    func testSQLDatabaseDetailEndpoint() async throws {
        // First get a database ID
        do {
            let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())

            guard let firstDb = databases.first else {
                print("No databases available for detail test")
                return
            }

            // Test fetching detail
            let detail: [SQLDatabase] = try await apiClient.request(.sqlDatabase(id: firstDb.id))
            XCTAssertFalse(detail.isEmpty, "Should get at least one database in response")

            if let db = detail.first {
                print("Database detail: \(db.name)")
            }
        } catch {
            XCTFail("Failed to load SQL database detail: \(error)")
        }
    }

    func testSQLPerformanceEndpoint() async throws {
        // First get a database ID
        do {
            let databases: [SQLDatabaseOverview] = try await apiClient.request(.sqlDatabasesOverview())

            guard let firstDb = databases.first else {
                print("No databases available for performance test")
                return
            }

            // Test fetching performance
            let performance: SQLPerformanceStats? = try await apiClient.requestOptional(.sqlPerformance(resourceId: firstDb.id))
            print("Performance data loaded: \(performance != nil)")

            if let perf = performance {
                print("CPU: \(perf.cpuPercent ?? 0)%, DTU: \(perf.dtuPercent ?? 0)%, Storage: \(perf.storagePercent ?? 0)%")
            }
        } catch {
            XCTFail("Failed to load SQL performance: \(error)")
        }
    }

    // MARK: - Dashboard Endpoints

    func testDashboardSummaryEndpoint() async throws {
        do {
            let summary: DashboardSummary = try await apiClient.request(.dashboardSummary)
            XCTAssertGreaterThanOrEqual(summary.resourcesCount, 0, "Resources count should be >= 0")
            print("Dashboard: \(summary.resourcesCount) resources, \(summary.clientsCount) clients, \(summary.activeAlertsCount) alerts")
        } catch {
            XCTFail("Failed to load dashboard summary: \(error)")
        }
    }

    // MARK: - Endpoint Path Validation

    func testEndpointPaths() {
        // Validate that endpoint paths are correctly formed
        let testCases: [(APIEndpoint, String)] = [
            (.azureTenants, "/azure/tenants"),
            (.azureResources(), "/azure/resources"),
            (.azureCosts(), "/azure/costs"),
            (.sqlDatabases(), "/sql/databases"),
            (.sqlDatabasesOverview(), "/sql/databases/overview"),
            (.dashboardSummary, "/dashboard/summary"),
        ]

        for (endpoint, expectedPath) in testCases {
            XCTAssertEqual(endpoint.path, expectedPath, "Path mismatch for \(endpoint)")
        }
    }
}
