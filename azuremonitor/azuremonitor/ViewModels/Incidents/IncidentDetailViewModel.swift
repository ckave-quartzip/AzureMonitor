import Foundation
import Combine

@MainActor
class IncidentDetailViewModel: ObservableObject {
    @Published var incident: Incident?
    @Published var isLoading = false
    @Published var error: Error?

    private let repository = IncidentRepository()
    private let incidentId: UUID

    init(incidentId: UUID) {
        self.incidentId = incidentId
    }

    func loadDetails() async {
        isLoading = true
        error = nil

        do {
            incident = try await repository.fetchIncident(id: incidentId)
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
