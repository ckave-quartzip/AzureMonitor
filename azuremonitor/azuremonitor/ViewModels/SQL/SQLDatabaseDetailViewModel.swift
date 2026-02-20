import Foundation
import Combine

@MainActor
class SQLDatabaseDetailViewModel: ObservableObject {
    @Published var database: SQLDatabase?
    @Published var performance: SQLPerformanceStats?
    @Published var queryInsights: [SQLQueryInsight] = []
    @Published var waitStatistics: [SQLWaitStatistic] = []
    @Published var recommendations: [SQLRecommendation] = []

    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasLoaded = false

    private let apiClient = APIClient.shared
    let databaseId: UUID

    init(databaseId: UUID) {
        self.databaseId = databaseId
    }

    func loadDatabase() async {
        isLoading = true
        error = nil

        do {
            // API may return an array, so fetch as array and filter by ID
            let databases: [SQLDatabase] = try await apiClient.request(.sqlDatabase(id: databaseId))
            database = databases.first { $0.id == databaseId } ?? databases.first
            print("SQL Detail: Loaded database: \(database?.name ?? "none")")
        } catch {
            print("SQL Detail: Failed to load database: \(error)")
            self.error = error
        }

        isLoading = false
    }

    func loadPerformance() async {
        do {
            // API may return an array, so try array first, then single object
            let stats: [SQLPerformanceStats] = try await apiClient.requestArrayOrEmpty(.sqlPerformance(resourceId: databaseId))
            performance = stats.first
            if performance == nil {
                // Try as single object in case API returns object
                performance = try await apiClient.requestOptional(.sqlPerformance(resourceId: databaseId))
            }
        } catch {
            print("Failed to load performance: \(error)")
        }
    }

    func loadQueryInsights() async {
        do {
            queryInsights = try await apiClient.requestArrayOrEmpty(.sqlInsights(resourceId: databaseId))
        } catch {
            print("Failed to load query insights: \(error)")
        }
    }

    func loadWaitStatistics() async {
        do {
            waitStatistics = try await apiClient.requestArrayOrEmpty(.sqlWaitStatistics(resourceId: databaseId))
        } catch {
            print("Failed to load wait statistics: \(error)")
        }
    }

    func loadRecommendations() async {
        do {
            recommendations = try await apiClient.requestArrayOrEmpty(.sqlRecommendations(resourceId: databaseId))
        } catch {
            print("Failed to load recommendations: \(error)")
        }
    }

    func loadAllData() async {
        await loadDatabase()
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadPerformance() }
            group.addTask { await self.loadQueryInsights() }
            group.addTask { await self.loadWaitStatistics() }
            group.addTask { await self.loadRecommendations() }
        }
        hasLoaded = true
    }

    func loadIfNeeded() async {
        guard !hasLoaded && !isLoading else { return }
        await loadAllData()
    }
}
