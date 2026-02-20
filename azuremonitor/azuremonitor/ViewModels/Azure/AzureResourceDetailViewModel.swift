import Foundation
import Combine

@MainActor
class AzureResourceDetailViewModel: ObservableObject {
    @Published var resource: AzureResource?
    @Published var costRecords: [AzureResourceCostRecord] = []
    @Published var metricRecords: [AzureResourceMetricRecord] = []
    @Published var linkedResource: Resource?

    @Published var isLoading = false
    @Published var error: Error?
    @Published var hasLoaded = false

    private let apiClient = APIClient.shared
    let resourceId: UUID

    init(resourceId: UUID) {
        self.resourceId = resourceId
    }

    func loadResource() async {
        isLoading = true
        error = nil

        do {
            // API returns an array in data field, so fetch as array and filter by ID
            let resources: [AzureResource] = try await apiClient.request(.azureResource(id: resourceId))
            resource = resources.first { $0.id == resourceId }

            // If not found by exact ID match, just take the first one (API might filter)
            if resource == nil {
                resource = resources.first
            }
        } catch {
            print("Failed to load resource: \(error)")
            self.error = error
        }

        isLoading = false
    }

    /// ID of the linked compute VM if this is a SQL VM
    private var linkedComputeVMId: UUID?

    func loadCostData() async {
        do {
            // API returns array of cost records
            costRecords = try await apiClient.requestArrayOrEmpty(.azureResourceCosts(id: resourceId))

            // If no costs and this is a SqlVirtualMachine, try the linked compute VM
            if costRecords.isEmpty, let vmId = linkedComputeVMId {
                costRecords = try await apiClient.requestArrayOrEmpty(.azureResourceCosts(id: vmId))
            }
        } catch {
            print("Failed to load cost data: \(error)")
        }
    }

    func loadMetrics() async {
        do {
            // API returns array of metric records
            metricRecords = try await apiClient.requestArrayOrEmpty(.azureResourceMetrics(id: resourceId))

            // If no metrics and this is a SqlVirtualMachine, try to find the linked compute VM
            if metricRecords.isEmpty, let res = resource {
                if res.resourceType.lowercased().contains("sqlvirtualmachine") {
                    await loadMetricsFromLinkedComputeVM(sqlVMName: res.name)
                }
            }
        } catch {
            print("Failed to load metrics: \(error)")
        }
    }

    /// SqlVirtualMachine resources don't have metrics - the metrics are stored under the compute VM
    /// Try to find the matching compute VM by name and load its metrics
    private func loadMetricsFromLinkedComputeVM(sqlVMName: String) async {
        do {
            // Fetch all Azure resources to find the matching compute VM
            let allResources: [AzureResource] = try await apiClient.requestArrayOrEmpty(.azureResources())

            // Find a compute VM with a similar name (case-insensitive)
            let normalizedName = sqlVMName.lowercased()
            let computeVM = allResources.first { res in
                res.resourceType.lowercased() == "microsoft.compute/virtualmachines" &&
                res.name.lowercased() == normalizedName
            }

            if let vm = computeVM {
                print("Found linked compute VM: \(vm.name) (ID: \(vm.id))")
                linkedComputeVMId = vm.id  // Save for cost loading
                metricRecords = try await apiClient.requestArrayOrEmpty(.azureResourceMetrics(id: vm.id))
                print("Loaded \(metricRecords.count) metrics from linked compute VM")

                // Also load costs from linked VM if we don't have any
                if costRecords.isEmpty {
                    costRecords = try await apiClient.requestArrayOrEmpty(.azureResourceCosts(id: vm.id))
                    print("Loaded \(costRecords.count) cost records from linked compute VM")
                }
            } else {
                print("No linked compute VM found for SQL VM: \(sqlVMName)")
            }
        } catch {
            print("Failed to load metrics from linked compute VM: \(error)")
        }
    }

    // Computed properties for backward compatibility
    var totalCost: Double {
        costRecords.compactMap { $0.cost }.reduce(0, +)
    }

    var latestMetrics: [String: AzureResourceMetricRecord] {
        // Group by metric name and get the latest for each
        var latest: [String: AzureResourceMetricRecord] = [:]
        for metric in metricRecords {
            if let name = metric.metricName {
                if let existing = latest[name] {
                    if let newTime = metric.timestampUtc, let existingTime = existing.timestampUtc, newTime > existingTime {
                        latest[name] = metric
                    }
                } else {
                    latest[name] = metric
                }
            }
        }
        return latest
    }

    func loadLinkedResource() async {
        // Check if there's an internal resource linked to this Azure resource
        // This is a placeholder implementation
    }

    func loadAllData() async {
        await loadResource()
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadCostData() }
            group.addTask { await self.loadMetrics() }
            group.addTask { await self.loadLinkedResource() }
        }
        hasLoaded = true
    }

    func loadIfNeeded() async {
        guard !hasLoaded && !isLoading else { return }
        await loadAllData()
    }
}

// MARK: - Supporting Models

/// Record from /azure/resources/:id/metrics (API returns array of these)
struct AzureResourceMetricRecord: Codable, Identifiable {
    let id: UUID
    let azureResourceId: UUID?
    let metricName: String?
    let metricNamespace: String?
    let timestampUtc: Date?
    let average: Double?
    let minimum: Double?
    let maximum: Double?
    let total: Double?
    let count: Int?
    let unit: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case azureResourceId = "azure_resource_id"
        case metricName = "metric_name"
        case metricNamespace = "metric_namespace"
        case timestampUtc = "timestamp_utc"
        case average, minimum, maximum, total, count, unit
        case createdAt = "created_at"
    }

    var displayValue: String {
        guard let val = average ?? total else { return "--" }
        if val >= 1_000_000_000 {
            return String(format: "%.1fGB", val / 1_000_000_000)
        } else if val >= 1_000_000 {
            return String(format: "%.1fMB", val / 1_000_000)
        } else if val >= 1_000 {
            return String(format: "%.1fKB", val / 1_000)
        } else if val < 1 && val > 0 {
            return String(format: "%.2f", val)
        } else {
            return String(format: "%.0f", val)
        }
    }

    var displayName: String {
        metricName ?? metricNamespace ?? "Unknown"
    }
}

/// Record from /azure/resources/:id/costs (API returns array of these)
struct AzureResourceCostRecord: Codable, Identifiable {
    let id: UUID
    let azureResourceId: UUID?
    let date: String?
    let cost: Double?
    let currency: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case azureResourceId = "azure_resource_id"
        case date, cost, currency
        case createdAt = "created_at"
    }
}

// MARK: - Legacy Models (kept for backward compatibility)

/// Legacy response wrapper - may not match current API
struct AzureResourceCostDetail: Codable {
    let resourceId: UUID?
    let totalCost: Double?
    let currency: String?
    let period: String?
    let costs: [AzureResourceDailyCost]?

    enum CodingKeys: String, CodingKey {
        case resourceId = "resource_id"
        case totalCost = "total_cost"
        case currency, period, costs
    }
}

struct AzureResourceDailyCost: Codable, Identifiable {
    var id: String { date ?? UUID().uuidString }
    let date: String?
    let cost: Double?
}

/// Legacy response wrapper - may not match current API
struct AzureResourceMetrics: Codable {
    let resourceId: UUID?
    let metrics: [AzureMetricDataPoint]?
    let timestamp: Date?

    enum CodingKeys: String, CodingKey {
        case resourceId = "resource_id"
        case metrics, timestamp
    }
}

struct AzureMetricDataPoint: Codable, Identifiable {
    var id: String { name ?? UUID().uuidString }
    let name: String?
    let value: Double?
    let unit: String?
    let average: Double?
    let minimum: Double?
    let maximum: Double?
    let timestamp: Date?

    var displayValue: String {
        guard let val = value ?? average else { return "--" }
        if val >= 1_000_000 {
            return String(format: "%.1fM", val / 1_000_000)
        } else if val >= 1_000 {
            return String(format: "%.1fK", val / 1_000)
        } else if val < 1 && val > 0 {
            return String(format: "%.2f", val)
        } else {
            return String(format: "%.0f", val)
        }
    }
}
