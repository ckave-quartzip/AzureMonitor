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

    func fetchMonitoringChecks(resourceId: UUID) async throws -> [MonitoringCheck] {
        try await apiClient.requestArrayOrEmpty(.monitoringChecks(resourceId: resourceId))
    }
}

// The status endpoint returns the full resource object
struct ResourceStatusResponse: Codable {
    let id: UUID
    let name: String
    let status: ResourceStatus
    let lastCheckedAt: Date?
    let resourceType: ResourceType
    let description: String?
    let clientId: UUID?
    let environmentId: UUID?
    let createdAt: Date?
    let updatedAt: Date?
    let isStandalone: Bool?
    let azureResourceId: String?
    let environments: ResourceEnvironmentInfo?

    // Computed properties for backwards compatibility with views
    var currentStatus: ResourceStatus { status }
    var resourceId: UUID { id }

    enum CodingKeys: String, CodingKey {
        case id, name, status, description, environments
        case lastCheckedAt = "last_checked_at"
        case resourceType = "resource_type"
        case clientId = "client_id"
        case environmentId = "environment_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case isStandalone = "is_standalone"
        case azureResourceId = "azure_resource_id"
    }
}

// The uptime endpoint returns the full resource object
struct ResourceUptimeResponse: Codable {
    let id: UUID
    let name: String
    let status: ResourceStatus
    let lastCheckedAt: Date?
    let resourceType: ResourceType?
    let description: String?
    let clientId: UUID?
    let environmentId: UUID?
    let createdAt: Date?
    let updatedAt: Date?
    let isStandalone: Bool?
    let azureResourceId: String?
    let environments: ResourceEnvironmentInfo?

    // Computed properties - return defaults since API doesn't provide actual uptime
    var uptime24h: Double { status == .up ? 100.0 : 0.0 }
    var uptime7d: Double { status == .up ? 100.0 : 0.0 }
    var uptime30d: Double { status == .up ? 100.0 : 0.0 }
    var uptime90d: Double { status == .up ? 100.0 : 0.0 }

    enum CodingKeys: String, CodingKey {
        case id, name, status, description, environments
        case lastCheckedAt = "last_checked_at"
        case resourceType = "resource_type"
        case clientId = "client_id"
        case environmentId = "environment_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case isStandalone = "is_standalone"
        case azureResourceId = "azure_resource_id"
    }
}
