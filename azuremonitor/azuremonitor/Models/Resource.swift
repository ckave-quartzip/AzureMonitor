import Foundation
import SwiftUI

struct Resource: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let resourceType: ResourceType
    let status: ResourceStatus
    let lastCheckedAt: Date?
    let clientId: UUID?
    let environmentId: UUID?
    let url: String?
    let description: String?
    let createdAt: Date?
    let updatedAt: Date?
    let isStandalone: Bool?
    let azureResourceId: String?
    // Nested environment info from detail responses
    let environments: ResourceEnvironmentInfo?

    enum CodingKeys: String, CodingKey {
        case id, name, status, url, description, environments
        case resourceType = "resource_type"
        case lastCheckedAt = "last_checked_at"
        case clientId = "client_id"
        case environmentId = "environment_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case isStandalone = "is_standalone"
        case azureResourceId = "azure_resource_id"
    }
}

// Nested environment info in resource responses
struct ResourceEnvironmentInfo: Codable, Hashable {
    let name: String?
    let clients: ResourceClientInfo?
}

struct ResourceClientInfo: Codable, Hashable {
    let name: String?
}

enum ResourceType: String, Codable, CaseIterable {
    case website, server, database, api, storage, network
    case vm, container, function, queue, other

    // Handle unknown resource types
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        self = ResourceType(rawValue: rawValue.lowercased()) ?? .other
    }

    var displayName: String {
        rawValue.capitalized
    }

    var icon: String {
        switch self {
        case .website: return "globe"
        case .server: return "server.rack"
        case .database: return "cylinder"
        case .api: return "arrow.left.arrow.right"
        case .storage: return "externaldrive"
        case .network: return "network"
        case .vm: return "desktopcomputer"
        case .container: return "shippingbox"
        case .function: return "function"
        case .queue: return "list.bullet.rectangle"
        case .other: return "questionmark.circle"
        }
    }
}

enum ResourceStatus: String, Codable {
    case up, down, degraded, unknown

    // Handle unknown status values from API
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        // Map common variations
        switch rawValue.lowercased() {
        case "up", "healthy", "online": self = .up
        case "down", "unhealthy", "offline": self = .down
        case "degraded", "warning": self = .degraded
        default: self = .unknown
        }
    }

    var color: Color {
        switch self {
        case .up: return .statusUp
        case .down: return .statusDown
        case .degraded: return .statusDegraded
        case .unknown: return .statusUnknown
        }
    }

    var displayName: String {
        rawValue.uppercased()
    }
}
