import Foundation
import Combine

@MainActor
class AlertsListViewModel: ObservableObject {
    @Published var alerts: [Alert] = []
    @Published var alertRules: [AlertRule] = []
    @Published var alertTemplates: [AlertTemplate] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedTab = 0
    @Published var selectedSeverity: AlertSeverity?
    @Published var selectedStatus: AlertStatus?

    private let repository = AlertRepository()

    var filteredAlerts: [Alert] {
        alerts.filter { alert in
            let matchesSeverity = selectedSeverity == nil || alert.severity == selectedSeverity
            let matchesStatus = selectedStatus == nil || alert.status == selectedStatus
            return matchesSeverity && matchesStatus
        }
    }

    var activeAlerts: [Alert] {
        filteredAlerts.filter { $0.status == .active }
    }

    var acknowledgedAlerts: [Alert] {
        filteredAlerts.filter { $0.status == .acknowledged }
    }

    var resolvedAlerts: [Alert] {
        filteredAlerts.filter { $0.status == .resolved }
    }

    func loadAlerts() async {
        isLoading = alerts.isEmpty
        error = nil

        do {
            alerts = try await repository.fetchAlerts()
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func loadAlertRules() async {
        do {
            alertRules = try await repository.fetchAlertRules()
        } catch {
            self.error = error
        }
    }

    func loadAlertTemplates() async {
        do {
            alertTemplates = try await repository.fetchAlertTemplates()
        } catch {
            self.error = error
        }
    }

    func acknowledgeAlert(_ alert: Alert) async {
        do {
            try await repository.acknowledgeAlert(id: alert.id)
            Haptics.success()
            await loadAlerts()
            NotificationCenter.default.post(name: .alertsDidChange, object: nil)
        } catch {
            self.error = error
            Haptics.error()
        }
    }

    func resolveAlert(_ alert: Alert) async {
        do {
            try await repository.resolveAlert(id: alert.id)
            Haptics.success()
            await loadAlerts()
            NotificationCenter.default.post(name: .alertsDidChange, object: nil)
        } catch {
            self.error = error
            Haptics.error()
        }
    }
}
