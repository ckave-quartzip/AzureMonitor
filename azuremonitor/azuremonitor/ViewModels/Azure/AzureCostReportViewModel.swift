import Foundation
import Combine

@MainActor
class AzureCostReportViewModel: ObservableObject {
    @Published var costSummary: AzureCostSummary?
    @Published var dailyCosts: [DailyCost] = []
    @Published var costsByResourceGroup: [ResourceGroupCost] = []
    @Published var costsByCategory: [CategoryCost] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasLoaded = false

    // Loading progress tracking
    @Published var loadingProgress: Double = 0
    @Published var loadingStatus: String = ""

    // Date range for filtering
    @Published var fromDate: Date = Calendar.current.date(byAdding: .day, value: -29, to: Date())!
    @Published var toDate: Date = Date()
    @Published var selectedTenantId: UUID?

    private let apiClient = APIClient.shared

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

    func loadCostData() async {
        isLoading = true
        error = nil
        loadingProgress = 0
        loadingStatus = "Fetching cost records..."

        do {
            // Fetch all cost records with pagination and date filtering
            loadingProgress = 0.1
            let records = try await apiClient.fetchAllCostRecords(
                tenantId: selectedTenantId,
                dateFrom: fromDateString,
                dateTo: toDateString
            )

            loadingProgress = 0.5
            loadingStatus = "Processing cost summary..."
            costSummary = AzureCostSummary.from(records: records)

            loadingProgress = 0.65
            loadingStatus = "Calculating daily costs..."
            dailyCosts = DailyCost.from(records: records)

            loadingProgress = 0.8
            loadingStatus = "Grouping by resource..."
            costsByResourceGroup = ResourceGroupCost.from(records: records)

            loadingProgress = 0.9
            loadingStatus = "Categorizing costs..."
            costsByCategory = CategoryCost.from(records: records)

            loadingProgress = 1.0
            loadingStatus = "Complete"
            hasLoaded = true
        } catch {
            self.error = error
        }

        isLoading = false
    }

    func loadIfNeeded() async {
        guard !hasLoaded && !isLoading else { return }
        await loadCostData()
    }
}
