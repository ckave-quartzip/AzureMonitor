import Foundation
@testable import azuremonitor

/// Mock API client for testing ViewModels without network calls
class MockAPIClient {
    var shouldFail = false
    var mockError: Error?

    // Mock data responses
    var mockTenants: [AzureTenant] = []
    var mockResources: [AzureResource] = []
    var mockSQLDatabases: [SQLDatabaseOverview] = []
    var mockSQLStatsSummary: SQLStatsSummary?
    var mockDashboardSummary: DashboardSummary?

    func request<T: Codable>(_ endpoint: APIEndpoint) async throws -> T {
        if shouldFail {
            throw mockError ?? APIError.serverError(message: "Mock error")
        }

        // Return appropriate mock data based on endpoint
        switch endpoint {
        case .azureTenants:
            return mockTenants as! T
        case .azureResources:
            return mockResources as! T
        case .sqlDatabasesOverview:
            return mockSQLDatabases as! T
        case .sqlStatsSummary:
            if let summary = mockSQLStatsSummary {
                return summary as! T
            }
            throw APIError.noData
        case .dashboardSummary:
            if let summary = mockDashboardSummary {
                return summary as! T
            }
            throw APIError.noData
        default:
            throw APIError.notFound(resource: "Mock not implemented for \(endpoint)")
        }
    }

    // Helper to create sample mock data
    static func createSampleData() -> MockAPIClient {
        let mock = MockAPIClient()

        // Sample SQL databases with stats
        mock.mockSQLDatabases = [
            SQLDatabaseOverview(
                id: UUID(),
                name: "TestDB1",
                resourceType: "Microsoft.Sql/servers/databases",
                location: "eastus",
                tenantName: "Test Tenant",
                optimizationScore: 85,
                latestStats: SQLLatestStats(
                    cpuPercent: 45.5,
                    dtuPercent: 32.0,
                    storagePercent: 67.2,
                    connectionCount: 15,
                    deadlockCount: 0
                ),
                recommendationCount: 2
            ),
            SQLDatabaseOverview(
                id: UUID(),
                name: "TestDB2",
                resourceType: "Microsoft.Sql/servers/databases",
                location: "westus",
                tenantName: "Test Tenant",
                optimizationScore: 72,
                latestStats: SQLLatestStats(
                    cpuPercent: 82.3,
                    dtuPercent: 75.0,
                    storagePercent: 45.0,
                    connectionCount: 30,
                    deadlockCount: 1
                ),
                recommendationCount: 5
            )
        ]

        mock.mockSQLStatsSummary = SQLStatsSummary(
            totalDatabases: 2,
            averageCpuPercent: 63.9,
            averageDtuPercent: 53.5,
            averageStoragePercent: 56.1,
            averageHealthScore: 78,
            recommendations: nil
        )

        return mock
    }
}

// MARK: - Sample Data Extensions for Testing

extension SQLDatabaseOverview {
    init(
        id: UUID,
        name: String,
        resourceType: String?,
        location: String?,
        tenantName: String?,
        optimizationScore: Int?,
        latestStats: SQLLatestStats?,
        recommendationCount: Int?
    ) {
        // This initializer is for testing only
        // Note: You'll need to make the struct have a public init or use a different approach
        fatalError("Use mock JSON decoding for testing")
    }
}
