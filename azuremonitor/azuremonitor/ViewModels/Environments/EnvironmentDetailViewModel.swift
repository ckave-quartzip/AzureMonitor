import Foundation
import Combine

@MainActor
class EnvironmentDetailViewModel: ObservableObject {
    @Published var environment: DeploymentEnvironment?
    @Published var resources: [Resource] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasLoaded = false

    private let apiClient = APIClient.shared
    private let environmentId: UUID

    init(environmentId: UUID) {
        self.environmentId = environmentId
    }

    func loadDetails() async {
        isLoading = true
        error = nil

        do {
            // Fetch environment details
            environment = try await apiClient.request(.environment(id: environmentId))

            // Fetch resources for this environment
            let allResources: [Resource] = try await apiClient.request(.resources(clientId: nil))
            resources = allResources.filter { $0.environmentId == environmentId }
            hasLoaded = true
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func loadIfNeeded() async {
        guard !hasLoaded && !isLoading else { return }
        await loadDetails()
    }

    var resourcesByStatus: (up: [Resource], down: [Resource], degraded: [Resource]) {
        let up = resources.filter { $0.status == .up }
        let down = resources.filter { $0.status == .down }
        let degraded = resources.filter { $0.status == .degraded }
        return (up, down, degraded)
    }

    var healthSummary: String {
        let total = resources.count
        let healthy = resources.filter { $0.status == .up }.count
        if total == 0 { return "No resources" }
        return "\(healthy)/\(total) healthy"
    }
}
