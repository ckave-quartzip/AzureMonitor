import Foundation
import Combine

@MainActor
class AlertDetailViewModel: ObservableObject {
    @Published var alert: Alert?
    @Published var isLoading = false
    @Published var error: Error?

    private let repository = AlertRepository()
    private let alertId: UUID

    init(alertId: UUID) {
        self.alertId = alertId
    }

    func loadDetails() async {
        isLoading = true
        error = nil

        do {
            alert = try await repository.fetchAlert(id: alertId)
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func acknowledge() async {
        guard let alert = alert else { return }

        do {
            try await repository.acknowledgeAlert(id: alert.id)
            Haptics.success()
            await loadDetails()
            NotificationCenter.default.post(name: .alertsDidChange, object: nil)
        } catch {
            self.error = error
            Haptics.error()
        }
    }

    func resolve() async {
        guard let alert = alert else { return }

        do {
            try await repository.resolveAlert(id: alert.id)
            Haptics.success()
            await loadDetails()
            NotificationCenter.default.post(name: .alertsDidChange, object: nil)
        } catch {
            self.error = error
            Haptics.error()
        }
    }
}
