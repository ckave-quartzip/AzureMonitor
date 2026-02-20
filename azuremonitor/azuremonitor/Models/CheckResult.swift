import Foundation

struct CheckResult: Codable, Identifiable, Hashable {
    let id: UUID
    let checkId: UUID
    let status: ResourceStatus
    let responseTimeMs: Int?
    let statusCode: Int?
    let checkedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, status
        case checkId = "check_id"
        case responseTimeMs = "response_time_ms"
        case statusCode = "status_code"
        case checkedAt = "checked_at"
    }
}
