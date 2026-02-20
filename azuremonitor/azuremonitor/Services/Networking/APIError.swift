import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case forbidden
    case notFound(resource: String)
    case validationError(message: String)
    case rateLimited
    case serverError(message: String)
    case networkError(underlying: Error)
    case decodingError(underlying: Error)
    case invalidResponse
    case noData

    var errorDescription: String? {
        switch self {
        case .unauthorized:
            return "Please sign in to continue"
        case .forbidden:
            return "You don't have permission for this action"
        case .notFound(let resource):
            return "\(resource) not found"
        case .validationError(let message):
            return message
        case .rateLimited:
            return "Too many requests. Please wait."
        case .serverError(let message):
            return message
        case .networkError:
            return "Network error. Check your connection."
        case .decodingError:
            return "Error processing response"
        case .invalidResponse:
            return "Invalid server response"
        case .noData:
            return "No data received"
        }
    }
}
