import Foundation
import Combine

@MainActor
class APIClient: ObservableObject {
    static let shared = APIClient()

    private let baseURL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
    private let session: URLSession
    private let keychainService = KeychainService()
    private let decoder: JSONDecoder

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            let formatters = [
                ISO8601DateFormatter(),
                { () -> DateFormatter in
                    let f = DateFormatter()
                    f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
                    return f
                }(),
                { () -> DateFormatter in
                    let f = DateFormatter()
                    f.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
                    return f
                }()
            ]

            for formatter in formatters {
                if let formatter = formatter as? ISO8601DateFormatter {
                    if let date = formatter.date(from: dateString) { return date }
                } else if let formatter = formatter as? DateFormatter {
                    if let date = formatter.date(from: dateString) { return date }
                }
            }

            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode date")
        }
    }

    func request<T: Codable>(_ endpoint: APIEndpoint) async throws -> T {
        var request = URLRequest(url: endpoint.url(baseURL: baseURL))
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Always use API key for API authentication
        if let apiKey = keychainService.getAPIKey() {
            request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
            print("Using API key auth")
        } else {
            print("WARNING: No API key available")
        }

        print("API Request: \(endpoint.method.rawValue) \(request.url?.absoluteString ?? "")")

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Debug logging
        print("API Response Status: \(httpResponse.statusCode)")
        if let responseString = String(data: data, encoding: .utf8) {
            print("API Response Body: \(responseString.prefix(1000))")
        }

        switch httpResponse.statusCode {
        case 200...299:
            break
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound(resource: "Resource")
        case 429:
            throw APIError.rateLimited
        case 500...599:
            throw APIError.serverError(message: "Server error")
        default:
            throw APIError.serverError(message: "Unknown error: \(httpResponse.statusCode)")
        }

        do {
            let apiResponse = try decoder.decode(APIResponse<T>.self, from: data)

            guard apiResponse.success else {
                throw APIError.serverError(message: apiResponse.error?.message ?? "Unknown error")
            }

            guard let responseData = apiResponse.data else {
                throw APIError.noData
            }

            return responseData
        } catch let error as DecodingError {
            // Print detailed decoding error
            print("=== DECODING ERROR ===")
            switch error {
            case .keyNotFound(let key, let context):
                print("Key '\(key.stringValue)' not found: \(context.debugDescription)")
                print("CodingPath: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
            case .typeMismatch(let type, let context):
                print("Type mismatch for \(type): \(context.debugDescription)")
                print("CodingPath: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
            case .valueNotFound(let type, let context):
                print("Value not found for \(type): \(context.debugDescription)")
                print("CodingPath: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
            case .dataCorrupted(let context):
                print("Data corrupted: \(context.debugDescription)")
                print("CodingPath: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
            @unknown default:
                print("Unknown decoding error: \(error)")
            }
            print("======================")
            throw APIError.decodingError(underlying: error)
        }
    }

    /// Request that handles both single object and array responses, returning the first item
    func requestSingleOrFirst<T: Codable>(_ endpoint: APIEndpoint) async throws -> T? {
        // Try as single object first
        do {
            let result: T = try await request(endpoint)
            return result
        } catch let error as APIError {
            if case .decodingError = error {
                // Try as array
                do {
                    let results: [T] = try await request(endpoint)
                    return results.first
                } catch {
                    return nil
                }
            }
            throw error
        }
    }

    /// Request that tries to decode as array, returns empty array if API returns single object or error
    func requestArrayOrEmpty<T: Codable>(_ endpoint: APIEndpoint) async throws -> [T] {
        do {
            let results: [T] = try await request(endpoint)
            return results
        } catch let error as APIError {
            if case .decodingError = error {
                // API might return single object or different structure - return empty array
                return []
            }
            throw error
        }
    }

    /// Request that returns nil instead of throwing on decoding errors
    func requestOptional<T: Codable>(_ endpoint: APIEndpoint) async throws -> T? {
        do {
            let result: T = try await request(endpoint)
            return result
        } catch let error as APIError {
            if case .decodingError = error {
                return nil
            }
            throw error
        }
    }

    func requestVoid(_ endpoint: APIEndpoint) async throws {
        var request = URLRequest(url: endpoint.url(baseURL: baseURL))
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Always use API key for API authentication
        if let apiKey = keychainService.getAPIKey() {
            request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        }

        // Include body data if present
        if let bodyData = endpoint.bodyData {
            request.httpBody = bodyData
        }

        let (_, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(message: "Request failed: \(httpResponse.statusCode)")
        }
    }

    /// Fetch paginated data with metadata
    func requestWithMeta<T: Codable>(_ endpoint: APIEndpoint) async throws -> (data: T, meta: PaginationMeta?) {
        var request = URLRequest(url: endpoint.url(baseURL: baseURL))
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let apiKey = keychainService.getAPIKey() {
            request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(message: "Request failed: \(httpResponse.statusCode)")
        }

        let apiResponse = try decoder.decode(APIResponseWithMeta<T>.self, from: data)

        guard apiResponse.success else {
            throw APIError.serverError(message: apiResponse.error?.message ?? "Unknown error")
        }

        guard let responseData = apiResponse.data else {
            throw APIError.noData
        }

        return (responseData, apiResponse.meta)
    }

    /// Fetch all pages of paginated cost data with progress callback
    func fetchAllCostRecords(
        tenantId: UUID?,
        dateFrom: String?,
        dateTo: String?,
        progressCallback: ((Int, Int) -> Void)? = nil
    ) async throws -> [AzureCostRecord] {
        var allRecords: [AzureCostRecord] = []
        var currentPage = 1
        let perPage = 100

        while true {
            let endpoint = APIEndpoint.azureCosts(
                tenantId: tenantId,
                dateFrom: dateFrom,
                dateTo: dateTo,
                page: currentPage,
                perPage: perPage
            )

            let (records, meta): ([AzureCostRecord], PaginationMeta?) = try await requestWithMeta(endpoint)
            allRecords.append(contentsOf: records)

            // Report progress
            if let meta = meta {
                progressCallback?(currentPage, meta.totalPages)
            }

            // Check if we've fetched all pages
            if let meta = meta {
                if currentPage >= meta.totalPages || records.isEmpty {
                    break
                }
            } else {
                // No pagination meta, assume we got everything
                if records.count < perPage {
                    break
                }
            }

            currentPage += 1

            // Safety limit to prevent infinite loops
            if currentPage > 300 {
                break
            }
        }

        return allRecords
    }
}

struct PaginationMeta: Codable {
    let page: Int
    let perPage: Int
    let total: Int
    let totalPages: Int

    enum CodingKeys: String, CodingKey {
        case page
        case perPage = "per_page"
        case total
        case totalPages = "total_pages"
    }
}

struct APIResponseWithMeta<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let meta: PaginationMeta?
    let error: APIErrorResponse?
}
