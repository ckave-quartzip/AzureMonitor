import Foundation

class IncidentRepository {
    private let apiClient = APIClient.shared

    func fetchIncidents(status: String? = nil, severity: String? = nil, limit: Int = 50, offset: Int = 0) async throws -> [Incident] {
        try await apiClient.request(.incidents(status: status, severity: severity, limit: limit, offset: offset))
    }

    func fetchIncident(id: UUID) async throws -> Incident {
        // API may return array or single object - handle both cases
        if let incident: Incident = try? await apiClient.request(.incident(id: id)) {
            return incident
        }
        // Try as array if single object decode fails
        let incidents: [Incident] = try await apiClient.request(.incident(id: id))
        guard let incident = incidents.first else {
            throw APIError.notFound(resource: "Incident")
        }
        return incident
    }
}
