import Foundation

// MARK: - System Settings

struct SystemSettings: Codable {
    var maintenanceMode: Bool
    var allowPublicRegistration: Bool
    var defaultAlertThreshold: Int
    var dataRetentionDays: Int
    var syncIntervalMinutes: Int
    var enableCostAlerts: Bool
    var costAlertThreshold: Decimal

    enum CodingKeys: String, CodingKey {
        case maintenanceMode = "maintenance_mode"
        case allowPublicRegistration = "allow_public_registration"
        case defaultAlertThreshold = "default_alert_threshold"
        case dataRetentionDays = "data_retention_days"
        case syncIntervalMinutes = "sync_interval_minutes"
        case enableCostAlerts = "enable_cost_alerts"
        case costAlertThreshold = "cost_alert_threshold"
    }
}

// MARK: - API Key

struct APIKey: Codable, Identifiable {
    let id: UUID
    let name: String
    let keyPrefix: String
    let createdAt: Date
    let lastUsedAt: Date?
    let expiresAt: Date?
    let isActive: Bool
    let permissions: [String]

    enum CodingKeys: String, CodingKey {
        case id, name, permissions
        case keyPrefix = "key_prefix"
        case createdAt = "created_at"
        case lastUsedAt = "last_used_at"
        case expiresAt = "expires_at"
        case isActive = "is_active"
    }
}

struct CreateAPIKeyRequest: Codable {
    let name: String
    let permissions: [String]
    let expiresInDays: Int?

    enum CodingKeys: String, CodingKey {
        case name, permissions
        case expiresInDays = "expires_in_days"
    }
}

struct CreateAPIKeyResponse: Codable {
    let id: UUID
    let key: String
    let name: String
}

// MARK: - Sync Scheduler

struct SyncScheduler: Codable {
    var azureSyncEnabled: Bool
    var azureSyncIntervalMinutes: Int
    var costSyncEnabled: Bool
    var costSyncIntervalMinutes: Int
    var healthCheckEnabled: Bool
    var healthCheckIntervalMinutes: Int
    var lastAzureSync: Date?
    var lastCostSync: Date?
    var lastHealthCheck: Date?

    enum CodingKeys: String, CodingKey {
        case azureSyncEnabled = "azure_sync_enabled"
        case azureSyncIntervalMinutes = "azure_sync_interval_minutes"
        case costSyncEnabled = "cost_sync_enabled"
        case costSyncIntervalMinutes = "cost_sync_interval_minutes"
        case healthCheckEnabled = "health_check_enabled"
        case healthCheckIntervalMinutes = "health_check_interval_minutes"
        case lastAzureSync = "last_azure_sync"
        case lastCostSync = "last_cost_sync"
        case lastHealthCheck = "last_health_check"
    }
}

// MARK: - Sync Log

struct SyncLog: Codable, Identifiable {
    let id: UUID
    let syncType: String
    let status: SyncStatus
    let startedAt: Date
    let completedAt: Date?
    let itemsProcessed: Int
    let errorMessage: String?

    enum CodingKeys: String, CodingKey {
        case id, status
        case syncType = "sync_type"
        case startedAt = "started_at"
        case completedAt = "completed_at"
        case itemsProcessed = "items_processed"
        case errorMessage = "error_message"
    }
}

enum SyncStatus: String, Codable {
    case running, completed, failed, pending

    // Handle unknown status values from API
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        self = SyncStatus(rawValue: rawValue.lowercased()) ?? .pending
    }
}

// MARK: - Managed User (for admin user management)

struct ManagedUser: Codable, Identifiable {
    let id: UUID
    let fullName: String?
    let avatarUrl: String?
    let createdAt: Date
    let updatedAt: Date?
    let roles: [String]
    let primaryRole: String?

    // Computed properties for UI compatibility
    var name: String? { fullName }
    var email: String { fullName ?? "Unknown User" }
    var role: UserRole {
        // Use primary_role first, then first role in array, default to viewer
        if let primary = primaryRole, let userRole = UserRole(rawValue: primary.lowercased()) {
            return userRole
        }
        if let firstRole = roles.first, let userRole = UserRole(rawValue: firstRole.lowercased()) {
            return userRole
        }
        return .viewer
    }
    var isActive: Bool { true }
    var lastLoginAt: Date? { updatedAt }

    enum CodingKeys: String, CodingKey {
        case id
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case roles
        case primaryRole = "primary_role"
    }

    // Custom decoder to handle API variations
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        fullName = try container.decodeIfPresent(String.self, forKey: .fullName)
        avatarUrl = try container.decodeIfPresent(String.self, forKey: .avatarUrl)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)
        roles = try container.decodeIfPresent([String].self, forKey: .roles) ?? []
        primaryRole = try container.decodeIfPresent(String.self, forKey: .primaryRole)
    }
}

enum UserRole: String, Codable, CaseIterable {
    case admin, editor, viewer

    // Handle unknown role values from API
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        self = UserRole(rawValue: rawValue.lowercased()) ?? .viewer
    }

    var displayName: String {
        rawValue.capitalized
    }

    var description: String {
        switch self {
        case .admin: return "Full access to all features"
        case .editor: return "Can create and edit resources"
        case .viewer: return "Read-only access"
        }
    }
}

struct CreateUserRequest: Codable {
    let email: String
    let name: String?
    let role: UserRole
    let sendInviteEmail: Bool

    enum CodingKeys: String, CodingKey {
        case email, name, role
        case sendInviteEmail = "send_invite_email"
    }
}

struct UpdateUserRequest: Codable {
    let name: String?
    let role: UserRole?
    let isActive: Bool?

    enum CodingKeys: String, CodingKey {
        case name, role
        case isActive = "is_active"
    }
}
