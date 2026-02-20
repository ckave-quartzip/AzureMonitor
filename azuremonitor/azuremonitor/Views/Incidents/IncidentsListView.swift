import SwiftUI

struct IncidentsListView: View {
    @StateObject private var viewModel = IncidentsListViewModel()
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
            if viewModel.isLoading && viewModel.incidents.isEmpty {
                LoadingView(message: "Loading incidents...")
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadIncidents() } })
            } else if viewModel.filteredIncidents.isEmpty {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: "No Incidents",
                    message: "Incidents will appear here"
                )
            } else {
                List(viewModel.filteredIncidents) { incident in
                    NavigationLink(destination: IncidentDetailView(incidentId: incident.id)) {
                        IncidentRow(incident: incident)
                    }
                    .buttonStyle(.plain)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Incidents")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("All") { viewModel.selectedStatus = nil }
                    ForEach([IncidentStatus.open, .investigating, .resolved], id: \.self) { status in
                        Button(status.rawValue.capitalized) { viewModel.selectedStatus = status }
                    }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                }
            }
        }
        .refreshable {
            await viewModel.loadIncidents()
        }
        .task {
            await viewModel.loadIncidents()
        }
    }
}
