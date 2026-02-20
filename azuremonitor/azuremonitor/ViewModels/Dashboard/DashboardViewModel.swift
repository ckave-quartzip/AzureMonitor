import Foundation
import Combine

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var summary: DashboardSummary?
    @Published var isLoading = false
    @Published var error: Error?
    @Published var refreshError: Error?
    @Published var hasLoaded = false

    private let repository = DashboardRepository()

    func loadDashboard() async {
        // Only show full loading state on initial load
        let isInitialLoad = summary == nil
        isLoading = isInitialLoad

        // Clear errors
        if isInitialLoad {
            error = nil
        }
        refreshError = nil

        do {
            summary = try await repository.fetchSummary()
            error = nil // Clear any previous error on success
            hasLoaded = true
        } catch is CancellationError {
            // Ignore cancellation - this happens when user pulls to refresh quickly
            // or navigates away during refresh
        } catch let urlError as URLError where urlError.code == .cancelled {
            // Ignore URL session cancellation
        } catch {
            if isInitialLoad {
                self.error = error
            } else {
                // On refresh failure, keep existing data and show refresh error
                self.refreshError = error
            }
        }

        isLoading = false
    }

    func loadIfNeeded() async {
        guard !hasLoaded && !isLoading else { return }
        await loadDashboard()
    }
}
