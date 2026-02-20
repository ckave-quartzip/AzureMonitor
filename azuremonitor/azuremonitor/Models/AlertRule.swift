import Foundation
import SwiftUI

enum AlertRuleType: String, Codable, CaseIterable {
    case threshold
    case statusChange = "status_change"
    case noData = "no_data"
    case anomaly

    var displayName: String {
        switch self {
        case .threshold: return "Threshold"
        case .statusChange: return "Status Change"
        case .noData: return "No Data"
        case .anomaly: return "Anomaly Detection"
        }
    }
}

struct AlertRule: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let ruleType: AlertRuleType
    var isEnabled: Bool
    let severity: AlertSeverity
    let description: String?
    let resourceId: UUID?
    let threshold: Double?
    let thresholdOperator: String?
    let duration: Int?
    let cooldownMinutes: Int?
    let createdAt: Date?
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, description, threshold, severity, duration
        case ruleType = "rule_type"
        case isEnabled = "is_enabled"
        case resourceId = "resource_id"
        case thresholdOperator = "threshold_operator"
        case cooldownMinutes = "cooldown_minutes"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        isEnabled = try container.decodeIfPresent(Bool.self, forKey: .isEnabled) ?? true
        description = try container.decodeIfPresent(String.self, forKey: .description)
        resourceId = try container.decodeIfPresent(UUID.self, forKey: .resourceId)
        threshold = try container.decodeIfPresent(Double.self, forKey: .threshold)
        thresholdOperator = try container.decodeIfPresent(String.self, forKey: .thresholdOperator)
        duration = try container.decodeIfPresent(Int.self, forKey: .duration)
        cooldownMinutes = try container.decodeIfPresent(Int.self, forKey: .cooldownMinutes)
        createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt)
        updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt)

        // Handle ruleType as either enum or string
        if let ruleTypeValue = try? container.decode(AlertRuleType.self, forKey: .ruleType) {
            ruleType = ruleTypeValue
        } else if let ruleTypeString = try? container.decode(String.self, forKey: .ruleType) {
            ruleType = AlertRuleType(rawValue: ruleTypeString) ?? .threshold
        } else {
            ruleType = .threshold
        }

        // Handle severity as either enum or string
        if let severityValue = try? container.decode(AlertSeverity.self, forKey: .severity) {
            severity = severityValue
        } else if let severityString = try? container.decode(String.self, forKey: .severity) {
            severity = AlertSeverity(rawValue: severityString) ?? .warning
        } else {
            severity = .warning
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(ruleType, forKey: .ruleType)
        try container.encode(isEnabled, forKey: .isEnabled)
        try container.encode(severity, forKey: .severity)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(resourceId, forKey: .resourceId)
        try container.encodeIfPresent(threshold, forKey: .threshold)
        try container.encodeIfPresent(thresholdOperator, forKey: .thresholdOperator)
        try container.encodeIfPresent(duration, forKey: .duration)
        try container.encodeIfPresent(cooldownMinutes, forKey: .cooldownMinutes)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }

    // Memberwise initializer for creating instances
    init(
        id: UUID,
        name: String,
        ruleType: AlertRuleType,
        isEnabled: Bool = true,
        severity: AlertSeverity = .warning,
        description: String? = nil,
        resourceId: UUID? = nil,
        threshold: Double? = nil,
        thresholdOperator: String? = nil,
        duration: Int? = nil,
        cooldownMinutes: Int? = nil,
        createdAt: Date? = nil,
        updatedAt: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.ruleType = ruleType
        self.isEnabled = isEnabled
        self.severity = severity
        self.description = description
        self.resourceId = resourceId
        self.threshold = threshold
        self.thresholdOperator = thresholdOperator
        self.duration = duration
        self.cooldownMinutes = cooldownMinutes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
