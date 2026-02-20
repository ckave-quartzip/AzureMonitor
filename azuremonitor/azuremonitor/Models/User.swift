import Foundation

struct User: Codable, Identifiable {
    let id: UUID
    let fullName: String?
    let avatarUrl: String?
    let createdAt: Date?
    let updatedAt: Date?
    let roles: [AppRole]
    let primaryRole: String?

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case roles
        case primaryRole = "primary_role"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        fullName = try container.decodeIfPresent(String.self, forKey: .fullName)
        avatarUrl = try container.decodeIfPresent(String.self, forKey: .avatarUrl)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)
        primaryRole = try container.decodeIfPresent(String.self, forKey: .primaryRole)

        // Decode roles array - may be strings or AppRole enums
        if let roleStrings = try? container.decode([String].self, forKey: .roles) {
            roles = roleStrings.compactMap { AppRole(rawValue: $0) }
        } else if let appRoles = try? container.decode([AppRole].self, forKey: .roles) {
            roles = appRoles
        } else {
            roles = []
        }
    }

    init(id: UUID, fullName: String?, avatarUrl: String? = nil, createdAt: Date? = nil, updatedAt: Date? = nil, roles: [AppRole], primaryRole: String? = nil) {
        self.id = id
        self.fullName = fullName
        self.avatarUrl = avatarUrl
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.roles = roles
        self.primaryRole = primaryRole
    }

    // Create a user from API key info (when /me returns key info instead of user)
    static func fromAPIKeyInfo(_ keyInfo: APIKeyInfo) -> User {
        return User(
            id: keyInfo.keyId,
            fullName: keyInfo.keyName,  // Use key name as display name
            roles: [.viewer]  // Default role
        )
    }

    // Display name for UI
    var displayName: String {
        fullName ?? "Unknown User"
    }
}

enum AppRole: String, Codable {
    case admin, editor, viewer
}

// Model for /me endpoint which returns API key info
struct APIKeyInfo: Codable {
    let keyId: UUID
    let keyName: String
    let keyPrefix: String
    let isEnabled: Bool
    let createdAt: Date
    let lastUsedAt: Date?
    let requestCount: Int
    let expiresAt: Date?

    enum CodingKeys: String, CodingKey {
        case keyId = "key_id"
        case keyName = "key_name"
        case keyPrefix = "key_prefix"
        case isEnabled = "is_enabled"
        case createdAt = "created_at"
        case lastUsedAt = "last_used_at"
        case requestCount = "request_count"
        case expiresAt = "expires_at"
    }
}
