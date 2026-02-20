import Foundation

class ClientRepository {
    private let apiClient = APIClient.shared

    func fetchClients(status: String? = nil, limit: Int = 50, offset: Int = 0) async throws -> [Client] {
        try await apiClient.request(.clients(status: status, limit: limit, offset: offset))
    }

    func fetchClient(id: UUID) async throws -> Client {
        try await apiClient.request(.client(id: id))
    }

    func fetchClientEnvironments(clientId: UUID) async throws -> [DeploymentEnvironment] {
        // The API returns the full client with environments nested inside
        let client: ClientWithEnvironments = try await apiClient.request(.clientEnvironments(clientId: clientId))
        return client.environments ?? []
    }
}

// Response wrapper for client with environments
struct ClientWithEnvironments: Codable {
    let id: UUID
    let name: String
    let environments: [DeploymentEnvironment]?
}
