import Foundation

struct Incident: Codable, Identifiable, Hashable {
    let id: UUID
    let title: String
    let description: String?
    let severity: AlertSeverity
    let status: IncidentStatus
    let createdAt: Date?
    let resolvedAt: Date?
    let resolutionNotes: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, severity, status
        case createdAt = "created_at"
        case resolvedAt = "resolved_at"
        case resolutionNotes = "resolution_notes"
    }
}

enum IncidentStatus: String, Codable {
    case open, investigating, resolved, closed

    // Handle unknown status values from API
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        self = IncidentStatus(rawValue: rawValue.lowercased()) ?? .open
    }
}
