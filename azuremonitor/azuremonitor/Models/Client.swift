import Foundation

struct Client: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let status: ClientStatus
    let contactEmail: String?
    let description: String?
    let monthlyHostingFee: Decimal?
    let createdAt: Date?
    let updatedAt: Date?
    // Nested environments returned by some endpoints
    let environments: [ClientEnvironmentSummary]?

    enum CodingKeys: String, CodingKey {
        case id, name, status, description, environments
        case contactEmail = "contact_email"
        case monthlyHostingFee = "monthly_hosting_fee"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// Lightweight environment summary nested in client responses
struct ClientEnvironmentSummary: Codable, Hashable {
    let id: UUID?
    let name: String?
}

enum ClientStatus: String, Codable {
    case active, inactive, suspended, pending

    // Handle unknown status values
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let rawValue = try container.decode(String.self)
        self = ClientStatus(rawValue: rawValue.lowercased()) ?? .active
    }
}
