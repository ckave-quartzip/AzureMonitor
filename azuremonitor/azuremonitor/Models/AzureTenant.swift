import Foundation

struct AzureTenant: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let tenantId: String
    let subscriptionId: String
    let isEnabled: Bool
    let lastSyncAt: Date?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name
        case tenantId = "tenant_id"
        case subscriptionId = "subscription_id"
        case isEnabled = "is_enabled"
        case lastSyncAt = "last_sync_at"
        case createdAt = "created_at"
    }

    // Custom decoder to handle missing or null fields
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        tenantId = try container.decode(String.self, forKey: .tenantId)
        subscriptionId = try container.decode(String.self, forKey: .subscriptionId)
        isEnabled = try container.decodeIfPresent(Bool.self, forKey: .isEnabled) ?? true
        lastSyncAt = try container.decodeIfPresent(Date.self, forKey: .lastSyncAt)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
    }
}
