import Foundation
import SwiftUI

/// Alert template from the /alert-templates endpoint
struct AlertTemplate: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let description: String?
    let ruleType: AlertRuleType
    let severity: AlertSeverity
    let azureResourceType: String?
    let threshold: Double?
    let thresholdOperator: String?
    let duration: Int?
    let cooldownMinutes: Int?
    let isBuiltIn: Bool
    let createdAt: Date?
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, name, description, severity, threshold, duration
        case ruleType = "rule_type"
        case azureResourceType = "azure_resource_type"
        case thresholdOperator = "threshold_operator"
        case cooldownMinutes = "cooldown_minutes"
        case isBuiltIn = "is_built_in"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        azureResourceType = try container.decodeIfPresent(String.self, forKey: .azureResourceType)
        threshold = try container.decodeIfPresent(Double.self, forKey: .threshold)
        thresholdOperator = try container.decodeIfPresent(String.self, forKey: .thresholdOperator)
        duration = try container.decodeIfPresent(Int.self, forKey: .duration)
        cooldownMinutes = try container.decodeIfPresent(Int.self, forKey: .cooldownMinutes)
        isBuiltIn = try container.decodeIfPresent(Bool.self, forKey: .isBuiltIn) ?? false
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
        try container.encode(severity, forKey: .severity)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(azureResourceType, forKey: .azureResourceType)
        try container.encodeIfPresent(threshold, forKey: .threshold)
        try container.encodeIfPresent(thresholdOperator, forKey: .thresholdOperator)
        try container.encodeIfPresent(duration, forKey: .duration)
        try container.encodeIfPresent(cooldownMinutes, forKey: .cooldownMinutes)
        try container.encode(isBuiltIn, forKey: .isBuiltIn)
        try container.encodeIfPresent(createdAt, forKey: .createdAt)
        try container.encodeIfPresent(updatedAt, forKey: .updatedAt)
    }
}
