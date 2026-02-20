import Foundation

class AlertRepository {
    private let apiClient = APIClient.shared

    func fetchAlerts(severity: String? = nil, status: String? = nil, limit: Int = 50, offset: Int = 0) async throws -> [Alert] {
        try await apiClient.request(.alerts(severity: severity, status: status, limit: limit, offset: offset))
    }

    func fetchAlert(id: UUID) async throws -> Alert {
        // API may return array or single object - handle both cases
        if let alert: Alert = try? await apiClient.request(.alert(id: id)) {
            return alert
        }
        // Try as array if single object decode fails
        let alerts: [Alert] = try await apiClient.request(.alert(id: id))
        guard let alert = alerts.first else {
            throw APIError.notFound(resource: "Alert")
        }
        return alert
    }

    func acknowledgeAlert(id: UUID) async throws {
        try await apiClient.requestVoid(.acknowledgeAlert(id: id))
    }

    func resolveAlert(id: UUID) async throws {
        try await apiClient.requestVoid(.resolveAlert(id: id))
    }

    func fetchAlertRules() async throws -> [AlertRule] {
        try await apiClient.request(.alertRules)
    }

    func fetchAlertTemplates(ruleType: String? = nil, azureResourceType: String? = nil) async throws -> [AlertTemplate] {
        try await apiClient.requestArrayOrEmpty(.alertTemplates(ruleType: ruleType, azureResourceType: azureResourceType))
    }
}
