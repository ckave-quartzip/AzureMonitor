import Foundation
import Combine

@MainActor
class ClientDetailViewModel: ObservableObject {
    @Published var client: Client?
    @Published var environments: [DeploymentEnvironment] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasLoaded = false

    private let repository = ClientRepository()
    private let clientId: UUID

    init(clientId: UUID) {
        self.clientId = clientId
    }

    func loadDetails() async {
        isLoading = true
        error = nil

        do {
            async let clientTask = repository.fetchClient(id: clientId)
            async let environmentsTask = repository.fetchClientEnvironments(clientId: clientId)

            let (client, environments) = try await (clientTask, environmentsTask)

            self.client = client
            self.environments = environments
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
