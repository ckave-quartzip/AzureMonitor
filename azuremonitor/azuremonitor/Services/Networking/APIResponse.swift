import Foundation

struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: APIErrorResponse?
    let meta: ResponseMeta?
}

struct APIErrorResponse: Codable {
    let code: String
    let message: String
}

struct ResponseMeta: Codable {
    let timestamp: Date?
    let requestId: String?
    let total: Int?
    let limit: Int?
    let offset: Int?

    enum CodingKeys: String, CodingKey {
        case timestamp, total, limit, offset
        case requestId = "request_id"
    }
}

struct EmptyResponse: Codable {}
