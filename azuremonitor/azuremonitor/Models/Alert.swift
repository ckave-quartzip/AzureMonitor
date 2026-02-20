import Foundation
import SwiftUI

struct Alert: Codable, Identifiable, Hashable {
    let id: UUID
    let message: String
    let severity: AlertSeverity
    let resourceId: UUID?
    let triggeredAt: Date
    let acknowledgedAt: Date?
    let resolvedAt: Date?
    let resourceName: String?
    let isActive: Bool?
    let isAcknowledged: Bool?

    enum CodingKeys: String, CodingKey {
        case id, message, severity
        case resourceId = "resource_id"
        case triggeredAt = "triggered_at"
        case acknowledgedAt = "acknowledged_at"
        case resolvedAt = "resolved_at"
        case resourceName = "resource_name"
        case isActive = "is_active"
        case isAcknowledged = "is_acknowledged"
    }

    /// Computed title from resource name or fallback
    var title: String {
        resourceName ?? "Alert"
    }

    /// Computed status based on resolved/acknowledged state
    var status: AlertStatus {
        if resolvedAt != nil {
            return .resolved
        } else if acknowledgedAt != nil || isAcknowledged == true {
            return .acknowledged
        }
        return .active
    }
}

enum AlertSeverity: String, Codable {
    case critical, warning, info

    // Handle unknown severity values from API
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        switch rawValue.lowercased() {
        case "critical", "high", "error": self = .critical
        case "warning", "medium": self = .warning
        case "info", "low": self = .info
        default: self = .info
        }
    }

    var color: Color {
        switch self {
        case .critical: return .severityCritical
        case .warning: return .severityWarning
        case .info: return .severityInfo
        }
    }

    var displayName: String {
        rawValue.uppercased()
    }
}

enum AlertStatus: String, Codable {
    case active, acknowledged, resolved

    // Handle unknown status values from API
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        self = AlertStatus(rawValue: rawValue.lowercased()) ?? .active
    }
}
