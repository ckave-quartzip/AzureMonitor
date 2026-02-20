import Foundation
import Combine

@MainActor
class IncidentsListViewModel: ObservableObject {
    @Published var incidents: [Incident] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedStatus: IncidentStatus?

    private let repository = IncidentRepository()

    var filteredIncidents: [Incident] {
        guard let status = selectedStatus else { return incidents }
        return incidents.filter { $0.status == status }
    }

    func loadIncidents() async {
        isLoading = incidents.isEmpty
        error = nil

        do {
            incidents = try await repository.fetchIncidents()
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
