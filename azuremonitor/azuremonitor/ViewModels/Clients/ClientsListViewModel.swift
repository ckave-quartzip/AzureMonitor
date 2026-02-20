import Foundation
import Combine

@MainActor
class ClientsListViewModel: ObservableObject {
    @Published var clients: [Client] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var searchText = ""
    @Published var selectedStatus: ClientStatus?

    private let repository = ClientRepository()

    var filteredClients: [Client] {
        clients.filter { client in
            let matchesSearch = searchText.isEmpty ||
                client.name.localizedCaseInsensitiveContains(searchText)
            let matchesStatus = selectedStatus == nil ||
                client.status == selectedStatus
            return matchesSearch && matchesStatus
        }
    }

    func loadClients() async {
        isLoading = clients.isEmpty
        error = nil

        do {
            clients = try await repository.fetchClients()
        } catch {
            self.error = error
        }

        isLoading = false
    }
}
