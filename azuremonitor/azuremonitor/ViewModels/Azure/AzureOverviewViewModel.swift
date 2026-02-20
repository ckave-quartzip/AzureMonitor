import Foundation
import Combine

@MainActor
class AzureOverviewViewModel: ObservableObject {
    @Published var tenants: [AzureTenant] = []
    @Published var resources: [AzureResource] = []
    @Published var costSummary: AzureCostSummary?
    @Published var costTrend: [DailyCost] = []
    @Published var selectedTenant: AzureTenant?
    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasLoaded = false

    // Loading progress tracking
    @Published var loadingProgress: Double = 0
    @Published var loadingStatus: String = ""

    // Date range for cost filtering
    @Published var fromDate: Date = Calendar.current.date(byAdding: .day, value: -29, to: Date())!
    @Published var toDate: Date = Date()

    private let repository = AzureRepository()
    private let apiClient = APIClient.shared

    var resourceCount: Int { resources.count }

    var resourcesByType: [String: [AzureResource]] {
        Dictionary(grouping: resources, by: { $0.resourceType })
    }

    private var fromDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: fromDate)
    }

    private var toDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: toDate)
    }

    func loadOverview() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        loadingProgress = 0
        loadingStatus = "Loading tenants..."

        do {
            // Step 1: Load tenants (20%)
            tenants = try await repository.fetchTenants()
            loadingProgress = 0.2
            loadingStatus = "Loading resources..."

            // Step 2: Load resources (50%)
            resources = try await repository.fetchResources(tenantId: selectedTenant?.id)
            loadingProgress = 0.5
            loadingStatus = "Loading cost data..."

            // Step 3: Load cost data directly with date filtering
            await loadCostData()

            loadingProgress = 1.0
            loadingStatus = "Complete"
            hasLoaded = true
        } catch {
            self.error = error
        }

        isLoading = false
    }

    private func loadCostData() async {
        do {
            // Fetch cost records with date filtering from API
            let records = try await apiClient.fetchAllCostRecords(
                tenantId: selectedTenant?.id,
                dateFrom: fromDateString,
                dateTo: toDateString
            ) { [weak self] currentPage, totalPages in
                Task { @MainActor in
                    self?.loadingProgress = 0.5 + (Double(currentPage) / Double(max(totalPages, 1)) * 0.4)
                    self?.loadingStatus = "Loading costs: page \(currentPage) of \(totalPages)"
                }
            }

            print("Loaded \(records.count) cost records for \(fromDateString) to \(toDateString)")
            costSummary = AzureCostSummary.from(records: records)
            costTrend = DailyCost.from(records: records)
        } catch {
            print("Failed to load cost data: \(error)")
            // Don't fail the whole load, just leave cost empty
            costSummary = nil
            costTrend = []
        }
    }

    func loadIfNeeded() async {
        guard !hasLoaded && !isLoading else { return }
        await loadOverview()
    }

    func selectTenant(_ tenant: AzureTenant?) async {
        selectedTenant = tenant
        await loadOverview()
    }

    func updateDateRange(from: Date, to: Date) async {
        fromDate = from
        toDate = to
        await loadOverview()
    }
}
