import Foundation

class AzureRepository {
    private let apiClient = APIClient.shared

    func fetchTenants() async throws -> [AzureTenant] {
        try await apiClient.request(.azureTenants)
    }

    func fetchResources(tenantId: UUID? = nil) async throws -> [AzureResource] {
        // Fetch all pages of resources
        var allResources: [AzureResource] = []
        var currentPage = 1
        let perPage = 100

        while true {
            let (resources, meta): ([AzureResource], PaginationMeta?) = try await apiClient.requestWithMeta(
                .azureResources(tenantId: tenantId, page: currentPage, perPage: perPage)
            )
            allResources.append(contentsOf: resources)

            if let meta = meta {
                if currentPage >= meta.totalPages || resources.isEmpty {
                    break
                }
            } else if resources.count < perPage {
                break
            }

            currentPage += 1
            if currentPage > 50 { break } // Safety limit
        }

        return allResources
    }

    func fetchCostRecords(tenantId: UUID? = nil, dateFrom: String? = nil, dateTo: String? = nil) async throws -> [AzureCostRecord] {
        try await apiClient.fetchAllCostRecords(tenantId: tenantId, dateFrom: dateFrom, dateTo: dateTo)
    }

    func fetchCostSummary(tenantId: UUID? = nil, dateFrom: String? = nil, dateTo: String? = nil) async throws -> AzureCostSummary {
        let records = try await fetchCostRecords(tenantId: tenantId, dateFrom: dateFrom, dateTo: dateTo)
        return AzureCostSummary.from(records: records)
    }

    func fetchCostTrend(tenantId: UUID? = nil, dateFrom: String? = nil, dateTo: String? = nil) async throws -> [DailyCost] {
        let records = try await fetchCostRecords(tenantId: tenantId, dateFrom: dateFrom, dateTo: dateTo)
        return DailyCost.from(records: records)
    }
}
