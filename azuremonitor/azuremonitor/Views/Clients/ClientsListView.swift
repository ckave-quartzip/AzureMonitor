import SwiftUI

struct ClientsListView: View {
    @StateObject private var viewModel = ClientsListViewModel()
    var isEmbedded: Bool = false

    var body: some View {
        Group {
            if isEmbedded {
                content
            } else {
                NavigationStack {
                    content
                }
            }
        }
    }

    private var content: some View {
        Group {
            if viewModel.isLoading && viewModel.clients.isEmpty {
                LoadingView(message: "Loading clients...")
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadClients() } })
            } else if viewModel.filteredClients.isEmpty {
                EmptyStateView(
                    icon: "building.2",
                    title: "No Clients",
                    message: "Clients will appear here"
                )
            } else {
                List(viewModel.filteredClients) { client in
                    NavigationLink(destination: ClientDetailView(clientId: client.id)) {
                        ClientRow(client: client)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Clients")
        .searchable(text: $viewModel.searchText, prompt: "Search clients")
        .refreshable {
            await viewModel.loadClients()
        }
        .task {
            await viewModel.loadClients()
        }
    }
}
