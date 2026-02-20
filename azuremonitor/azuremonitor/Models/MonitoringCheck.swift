import Foundation

struct MonitoringCheck: Codable, Identifiable, Hashable {
    let id: UUID
    let resourceId: UUID
    let name: String
    let checkType: String
    let isEnabled: Bool
    let interval: Int
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, interval
        case resourceId = "resource_id"
        case checkType = "check_type"
        case isEnabled = "is_enabled"
        case createdAt = "created_at"
    }

    // Manual initializer for creating instances in code
    init(id: UUID, resourceId: UUID, name: String, checkType: String, isEnabled: Bool, interval: Int, createdAt: Date?) {
        self.id = id
        self.resourceId = resourceId
        self.name = name
        self.checkType = checkType
        self.isEnabled = isEnabled
        self.interval = interval
        self.createdAt = createdAt
    }

    // Custom decoder to handle API variations
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        resourceId = try container.decode(UUID.self, forKey: .resourceId)
        name = try container.decode(String.self, forKey: .name)
        checkType = try container.decodeIfPresent(String.self, forKey: .checkType) ?? "http"
        isEnabled = try container.decodeIfPresent(Bool.self, forKey: .isEnabled) ?? true
        interval = try container.decodeIfPresent(Int.self, forKey: .interval) ?? 60
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
    }
}
