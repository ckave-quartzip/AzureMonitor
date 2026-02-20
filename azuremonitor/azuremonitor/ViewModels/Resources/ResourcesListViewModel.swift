import Foundation
import Combine

@MainActor
class ResourcesListViewModel: ObservableObject {
    @Published var resources: [Resource] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var searchText = ""
    @Published var selectedStatus: ResourceStatus?
    @Published var selectedType: ResourceType?

    private let repository = ResourceRepository()

    var filteredResources: [Resource] {
        resources.filter { resource in
            let matchesSearch = searchText.isEmpty ||
                resource.name.localizedCaseInsensitiveContains(searchText)
            let matchesStatus = selectedStatus == nil ||
                resource.status == selectedStatus
            let matchesType = selectedType == nil ||
                resource.resourceType == selectedType
            return matchesSearch && matchesStatus && matchesType
        }
    }

    func loadResources() async {
        isLoading = resources.isEmpty
        error = nil

        do {
            resources = try await repository.fetchResources()
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func clearFilters() {
        selectedStatus = nil
        selectedType = nil
        searchText = ""
    }
}
