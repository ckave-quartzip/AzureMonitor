import Foundation

struct DeploymentEnvironment: Codable, Identifiable, Hashable {
    let id: UUID
    let clientId: UUID?
    let name: String
    let description: String?
    let azureTenantId: UUID?
    let azureResourceGroup: String?
    let createdAt: Date?
    let updatedAt: Date?
    // Nested data from API
    let clients: EnvironmentClientInfo?

    enum CodingKeys: String, CodingKey {
        case id, name, description, clients
        case clientId = "client_id"
        case azureTenantId = "azure_tenant_id"
        case azureResourceGroup = "azure_resource_group"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // Custom decoder to handle missing nested fields
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        clientId = try container.decodeIfPresent(UUID.self, forKey: .clientId)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        azureTenantId = try container.decodeIfPresent(UUID.self, forKey: .azureTenantId)
        azureResourceGroup = try container.decodeIfPresent(String.self, forKey: .azureResourceGroup)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)
        clients = try container.decodeIfPresent(EnvironmentClientInfo.self, forKey: .clients)
    }

    // Computed property for client name
    var clientName: String? {
        clients?.name
    }
}

struct EnvironmentClientInfo: Codable, Hashable {
    let name: String?
}
