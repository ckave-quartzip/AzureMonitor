import Foundation

struct AzureResource: Codable, Identifiable, Hashable {
    let id: UUID
    let azureTenantId: UUID
    let azureResourceId: String
    let name: String
    let resourceType: String
    let location: String
    let resourceGroup: String
    let tags: [String: String]?
    let kind: String?
    let syncedAt: Date?
    let createdAt: Date?
    let updatedAt: Date?
    // Additional fields from API
    let sku: AzureResourceSku?
    let optimizationScore: Int?
    // Nested tenant info
    let azureTenants: AzureTenantInfo?

    enum CodingKeys: String, CodingKey {
        case id, name, location, tags, kind, sku
        case azureTenantId = "azure_tenant_id"
        case azureResourceId = "azure_resource_id"
        case resourceType = "resource_type"
        case resourceGroup = "resource_group"
        case syncedAt = "synced_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case optimizationScore = "optimization_score"
        case azureTenants = "azure_tenants"
    }

    // Custom decoder for defensive parsing
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        azureTenantId = try container.decode(UUID.self, forKey: .azureTenantId)
        azureResourceId = try container.decode(String.self, forKey: .azureResourceId)
        name = try container.decode(String.self, forKey: .name)
        resourceType = try container.decode(String.self, forKey: .resourceType)
        location = try container.decode(String.self, forKey: .location)
        resourceGroup = try container.decode(String.self, forKey: .resourceGroup)
        tags = try container.decodeIfPresent([String: String].self, forKey: .tags)
        kind = try container.decodeIfPresent(String.self, forKey: .kind)
        syncedAt = try container.decodeIfPresent(Date.self, forKey: .syncedAt)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)
        sku = try container.decodeIfPresent(AzureResourceSku.self, forKey: .sku)
        optimizationScore = try container.decodeIfPresent(Int.self, forKey: .optimizationScore)
        azureTenants = try container.decodeIfPresent(AzureTenantInfo.self, forKey: .azureTenants)
    }
}

struct AzureResourceSku: Codable, Hashable {
    let name: String?
    let tier: String?
}

struct AzureTenantInfo: Codable, Hashable {
    let name: String?
}
