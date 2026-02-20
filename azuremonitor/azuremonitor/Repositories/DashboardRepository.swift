import Foundation

class DashboardRepository {
    private let apiClient = APIClient.shared

    func fetchSummary() async throws -> DashboardSummary {
        try await apiClient.request(.dashboardSummary)
    }
}
