import Foundation
import Combine

/// Caches Azure cost data in the background to speed up UI loading
@MainActor
class CostDataCache: ObservableObject {
    static let shared = CostDataCache()

    @Published var costRecords: [AzureCostRecord] = []
    @Published var isLoading = false
    @Published var loadingProgress: Double = 0
    @Published var loadingStatus: String = ""
    @Published var lastUpdated: Date?
    @Published var error: Error?

    private let apiClient = APIClient.shared

    private init() {}

    /// Start loading cost data in the background
    func startBackgroundLoad(tenantId: UUID? = nil, dateFrom: String? = nil, dateTo: String? = nil) {
        guard !isLoading else { return }

        Task {
            await loadAllCostData(tenantId: tenantId, dateFrom: dateFrom, dateTo: dateTo)
        }
    }

    /// Load all cost data with progress tracking
    func loadAllCostData(tenantId: UUID? = nil, dateFrom: String? = nil, dateTo: String? = nil) async {
        guard !isLoading else { return }

        isLoading = true
        loadingProgress = 0
        loadingStatus = "Loading cost data..."
        error = nil

        do {
            let records = try await apiClient.fetchAllCostRecords(
                tenantId: tenantId,
                dateFrom: dateFrom,
                dateTo: dateTo
            ) { [weak self] currentPage, totalPages in
                Task { @MainActor in
                    self?.loadingProgress = Double(currentPage) / Double(max(totalPages, 1))
                    self?.loadingStatus = "Loading costs: page \(currentPage) of \(totalPages)"
                }
            }

            self.costRecords = records
            self.lastUpdated = Date()
            self.loadingProgress = 1.0
            self.loadingStatus = "Loaded \(records.count) cost records"
        } catch {
            self.error = error
            self.loadingStatus = "Failed to load cost data"
        }

        isLoading = false
    }

    /// Get cached summary
    var costSummary: AzureCostSummary? {
        guard !costRecords.isEmpty else { return nil }
        return AzureCostSummary.from(records: costRecords)
    }

    /// Get cached cost trend
    var costTrend: [DailyCost] {
        guard !costRecords.isEmpty else { return [] }
        return DailyCost.from(records: costRecords)
    }

    /// Filter cached records by tenant
    func records(forTenant tenantId: UUID?) -> [AzureCostRecord] {
        guard let tenantId = tenantId else { return costRecords }
        return costRecords.filter { $0.azureTenantId == tenantId }
    }

    /// Filter cached records by date range
    func records(from: Date, to: Date) -> [AzureCostRecord] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let fromString = formatter.string(from: from)
        let toString = formatter.string(from: to)

        return costRecords.filter { record in
            let date = record.usageDate
            return date >= fromString && date <= toString
        }
    }

    /// Clear the cache
    func clear() {
        costRecords = []
        lastUpdated = nil
        loadingProgress = 0
        loadingStatus = ""
    }
}
