import Foundation
import Combine

@MainActor
class ResourceDetailViewModel: ObservableObject {
    @Published var resource: Resource?
    @Published var status: ResourceStatusResponse?
    @Published var uptime: ResourceUptimeResponse?
    @Published var monitoringChecks: [MonitoringCheck] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasLoaded = false

    private let repository = ResourceRepository()
    private let resourceId: UUID

    init(resourceId: UUID) {
        self.resourceId = resourceId
    }

    func loadDetails() async {
        isLoading = true
        error = nil

        do {
            async let resourceTask = repository.fetchResource(id: resourceId)
            async let statusTask = repository.fetchResourceStatus(id: resourceId)
            async let uptimeTask = repository.fetchResourceUptime(id: resourceId)
            async let checksTask = repository.fetchMonitoringChecks(resourceId: resourceId)

            let (resource, status, uptime, checks) = try await (resourceTask, statusTask, uptimeTask, checksTask)

            self.resource = resource
            self.status = status
            self.uptime = uptime
            self.monitoringChecks = checks
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
}
