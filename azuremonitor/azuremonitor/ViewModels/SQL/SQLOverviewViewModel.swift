import Foundation
import Combine

@MainActor
class SQLOverviewViewModel: ObservableObject {
    @Published var databases: [SQLDatabaseOverview] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var searchText = ""
    @Published var selectedTenantId: UUID?
    @Published var hasLoaded = false

    private let apiClient = APIClient.shared

    var filteredDatabases: [SQLDatabaseOverview] {
        var result = databases

        if !searchText.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(searchText)
            }
        }

        return result
    }

    var totalDatabases: Int {
        databases.count
    }

    var averageCpuPercent: Double {
        guard !databases.isEmpty else { return 0 }
        let cpuValues = databases.compactMap { $0.latestStats?.cpuPercent }
        guard !cpuValues.isEmpty else { return 0 }
        return cpuValues.reduce(0, +) / Double(cpuValues.count)
    }

    var averageDtuPercent: Double {
        guard !databases.isEmpty else { return 0 }
        let dtuValues = databases.compactMap { $0.latestStats?.dtuPercent }
        guard !dtuValues.isEmpty else { return 0 }
        return dtuValues.reduce(0, +) / Double(dtuValues.count)
    }

    var averageStoragePercent: Double {
        guard !databases.isEmpty else { return 0 }
        let storageValues = databases.compactMap { $0.latestStats?.storagePercent }
        guard !storageValues.isEmpty else { return 0 }
        return storageValues.reduce(0, +) / Double(storageValues.count)
    }

    var averageHealthScore: Int {
        guard !databases.isEmpty else { return 0 }
        let scores = databases.compactMap { $0.optimizationScore }
        guard !scores.isEmpty else { return 0 }
        return scores.reduce(0, +) / scores.count
    }

    var highCPUDatabases: [SQLDatabaseOverview] {
        databases.filter { ($0.latestStats?.cpuPercent ?? 0) > 80 }
    }

    var highStorageDatabases: [SQLDatabaseOverview] {
        databases.filter { ($0.latestStats?.storagePercent ?? 0) > 80 }
    }

    func loadData() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil

        do {
            // Load databases - stats are computed client-side from this data
            print("SQL: Loading databases overview...")
            databases = try await apiClient.requestArrayOrEmpty(.sqlDatabasesOverview(tenantId: selectedTenantId))
            print("SQL: Loaded \(databases.count) databases")

            hasLoaded = true
        } catch {
            print("SQL: Error loading data: \(error)")
            self.error = error
        }

        isLoading = false
    }

    func loadIfNeeded() async {
        guard !hasLoaded && !isLoading else { return }
        await loadData()
    }

    func refresh() async {
        await loadData()
    }
}
