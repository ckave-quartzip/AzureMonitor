import Foundation
import Combine

@MainActor
class AlertRuleDetailViewModel: ObservableObject {
    @Published var alertRule: AlertRule?
    @Published var recentAlerts: [Alert] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var isSaving = false

    private let apiClient = APIClient.shared
    let ruleId: UUID

    init(ruleId: UUID) {
        self.ruleId = ruleId
    }

    func loadRule() async {
        isLoading = true
        error = nil

        do {
            alertRule = try await apiClient.request(.alertRule(id: ruleId))
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func loadRecentAlerts() async {
        // Load alerts that were triggered by this rule
        // This would filter alerts by rule ID if the API supports it
    }

    func toggleEnabled() async {
        guard var rule = alertRule else { return }
        rule.isEnabled.toggle()
        alertRule = rule

        isSaving = true
        do {
            try await apiClient.requestVoid(.updateAlertRule(id: ruleId))
        } catch {
            // Revert on failure
            rule.isEnabled.toggle()
            alertRule = rule
            self.error = error
        }
        isSaving = false
    }

    func deleteRule() async -> Bool {
        do {
            try await apiClient.requestVoid(.deleteAlertRule(id: ruleId))
            return true
        } catch {
            self.error = error
            return false
        }
    }

    func loadAllData() async {
        await loadRule()
        await loadRecentAlerts()
    }
}
