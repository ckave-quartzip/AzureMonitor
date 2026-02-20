import SwiftUI

struct ResourcesListView: View {
    @StateObject private var viewModel = ResourcesListViewModel()
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
            if viewModel.isLoading && viewModel.resources.isEmpty {
                LoadingView(message: "Loading resources...")
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadResources() } })
            } else if viewModel.filteredResources.isEmpty {
                EmptyStateView(
                    icon: "server.rack",
                    title: "No Resources",
                    message: viewModel.resources.isEmpty ? "No resources configured" : "No resources match your filters",
                    action: viewModel.resources.isEmpty ? nil : { viewModel.clearFilters() },
                    actionTitle: viewModel.resources.isEmpty ? nil : "Clear Filters"
                )
            } else {
                List(viewModel.filteredResources) { resource in
                    NavigationLink(destination: ResourceDetailView(resourceId: resource.id)) {
                        ResourceRow(resource: resource)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Resources")
        .searchable(text: $viewModel.searchText, prompt: "Search resources")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Section("Status") {
                        Button("All") { viewModel.selectedStatus = nil }
                        ForEach([ResourceStatus.up, .down, .degraded, .unknown], id: \.self) { status in
                            Button(status.displayName) { viewModel.selectedStatus = status }
                        }
                    }
                    Section("Type") {
                        Button("All Types") { viewModel.selectedType = nil }
                        ForEach(ResourceType.allCases, id: \.self) { type in
                            Button(type.displayName) { viewModel.selectedType = type }
                        }
                    }
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                }
            }
        }
        .refreshable {
            await viewModel.loadResources()
        }
        .task {
            await viewModel.loadResources()
        }
    }
}
