import Foundation

/// Diagnostic service to test all API endpoints and report decoding issues
@MainActor
class APIDiagnosticService {
    static let shared = APIDiagnosticService()

    private let apiClient = APIClient.shared
    private let baseURL = "https://zkqhktsvhazeljnncncr.supabase.co/functions/v1/public-api/v1"
    private let keychainService = KeychainService()

    struct DiagnosticResult {
        let endpoint: String
        let success: Bool
        let error: String?
        let rawResponse: String?
    }

    /// Run diagnostics on all endpoints and print results
    func runFullDiagnostics() async -> [DiagnosticResult] {
        print("\n" + String(repeating: "=", count: 60))
        print("🔍 STARTING API DIAGNOSTICS")
        print(String(repeating: "=", count: 60) + "\n")

        var results: [DiagnosticResult] = []

        // Test each endpoint type
        results.append(await testEndpoint("Dashboard Summary", endpoint: .dashboardSummary, type: DashboardSummary.self))
        results.append(await testEndpoint("Clients List", endpoint: .clients(), type: [Client].self))
        results.append(await testEndpoint("Resources List", endpoint: .resources(), type: [Resource].self))
        results.append(await testEndpoint("Alerts List", endpoint: .alerts(), type: [Alert].self))
        results.append(await testEndpoint("Incidents List", endpoint: .incidents(), type: [Incident].self))
        results.append(await testEndpoint("Users List", endpoint: .users, type: [ManagedUser].self))
        results.append(await testEndpoint("Alert Rules", endpoint: .alertRules, type: [AlertRule].self))
        results.append(await testEndpoint("Azure Tenants", endpoint: .azureTenants, type: [AzureTenant].self))
        results.append(await testEndpoint("Azure Resources", endpoint: .azureResources(), type: [AzureResource].self))
        results.append(await testEndpoint("Environments", endpoint: .environments(), type: [DeploymentEnvironment].self))
        // Note: SQL Databases are now fetched as Azure Resources filtered by type (Microsoft.Sql/*)

        // Test detail endpoints if we have data
        if let firstClient = await getFirstId(endpoint: .clients(), type: [Client].self) {
            results.append(await testEndpoint("Client Detail", endpoint: .client(id: firstClient), type: Client.self))
        }

        if let firstEnvironment = await getFirstId(endpoint: .environments(), type: [DeploymentEnvironment].self) {
            results.append(await testEndpoint("Environment Detail", endpoint: .environment(id: firstEnvironment), type: DeploymentEnvironment.self))
        }

        if let firstResource = await getFirstId(endpoint: .resources(), type: [Resource].self) {
            results.append(await testEndpoint("Resource Detail", endpoint: .resource(id: firstResource), type: Resource.self))
            results.append(await testEndpoint("Resource Status", endpoint: .resourceStatus(id: firstResource), type: ResourceStatusResponse.self))
            results.append(await testEndpoint("Resource Uptime", endpoint: .resourceUptime(id: firstResource), type: ResourceUptimeResponse.self))
        }

        if let firstAlert = await getFirstId(endpoint: .alerts(), type: [Alert].self) {
            results.append(await testEndpoint("Alert Detail", endpoint: .alert(id: firstAlert), type: Alert.self))
        }

        if let firstIncident = await getFirstId(endpoint: .incidents(), type: [Incident].self) {
            results.append(await testEndpoint("Incident Detail", endpoint: .incident(id: firstIncident), type: Incident.self))
        }

        // Print summary
        printSummary(results)

        return results
    }

    private func testEndpoint<T: Codable>(_ name: String, endpoint: APIEndpoint, type: T.Type) async -> DiagnosticResult {
        print("Testing: \(name)...")

        do {
            let _: T = try await apiClient.request(endpoint)
            print("  ✅ \(name): SUCCESS")
            return DiagnosticResult(endpoint: name, success: true, error: nil, rawResponse: nil)
        } catch {
            let errorMessage = describeError(error)
            print("  ❌ \(name): FAILED")
            print("     Error: \(errorMessage)")

            // Also fetch raw response for debugging
            let rawResponse = await fetchRawResponse(endpoint: endpoint)
            if let raw = rawResponse {
                print("     Raw Response (first 500 chars): \(String(raw.prefix(500)))")
            }

            return DiagnosticResult(endpoint: name, success: false, error: errorMessage, rawResponse: rawResponse)
        }
    }

    private func getFirstId<T: Codable & Identifiable>(endpoint: APIEndpoint, type: [T].Type) async -> T.ID? where T.ID == UUID {
        do {
            let items: [T] = try await apiClient.request(endpoint)
            return items.first?.id
        } catch {
            return nil
        }
    }

    private func fetchRawResponse(endpoint: APIEndpoint) async -> String? {
        var components = URLComponents(string: baseURL + endpoint.path)!
        if !endpoint.queryItems.isEmpty {
            components.queryItems = endpoint.queryItems
        }

        guard let url = components.url else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let apiKey = keychainService.getAPIKey() {
            request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        }

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            return String(data: data, encoding: .utf8)
        } catch {
            return nil
        }
    }

    private func describeError(_ error: Error) -> String {
        if let decodingError = error as? DecodingError {
            switch decodingError {
            case .keyNotFound(let key, let context):
                return "Missing key '\(key.stringValue)' at path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))"
            case .typeMismatch(let type, let context):
                return "Type mismatch for \(type) at path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))"
            case .valueNotFound(let type, let context):
                return "Value not found for \(type) at path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))"
            case .dataCorrupted(let context):
                return "Data corrupted at path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))"
            @unknown default:
                return "Unknown decoding error: \(decodingError)"
            }
        }
        return error.localizedDescription
    }

    private func printSummary(_ results: [DiagnosticResult]) {
        let passed = results.filter { $0.success }.count
        let failed = results.filter { !$0.success }.count

        print("\n" + String(repeating: "=", count: 60))
        print("📊 DIAGNOSTIC SUMMARY")
        print(String(repeating: "=", count: 60))
        print("Total endpoints tested: \(results.count)")
        print("✅ Passed: \(passed)")
        print("❌ Failed: \(failed)")

        if failed > 0 {
            print("\n🔴 FAILED ENDPOINTS:")
            for result in results where !result.success {
                print("  - \(result.endpoint): \(result.error ?? "Unknown error")")
            }
        }

        print(String(repeating: "=", count: 60) + "\n")
    }
}
