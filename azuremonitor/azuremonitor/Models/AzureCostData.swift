import Foundation

// Raw cost record from the API
struct AzureCostRecord: Codable, Identifiable {
    let id: UUID
    let azureTenantId: UUID
    let azureResourceId: String
    let resourceGroup: String
    let meterCategory: String?
    let meterSubcategory: String?
    let meterName: String?
    let costAmount: Decimal
    let currency: String
    let usageQuantity: Double?
    let usageUnit: String?
    let usageDate: String
    let billingPeriod: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, currency
        case azureTenantId = "azure_tenant_id"
        case azureResourceId = "azure_resource_id"
        case resourceGroup = "resource_group"
        case meterCategory = "meter_category"
        case meterSubcategory = "meter_subcategory"
        case meterName = "meter_name"
        case costAmount = "cost_amount"
        case usageQuantity = "usage_quantity"
        case usageUnit = "usage_unit"
        case usageDate = "usage_date"
        case billingPeriod = "billing_period"
        case createdAt = "created_at"
    }
}

// Client-computed summary from raw cost data
struct AzureCostSummary {
    let totalCost: Decimal
    let currency: String
    let period: DatePeriod
    let byTenant: [TenantCost]

    // Create summary from raw cost records
    static func from(records: [AzureCostRecord]) -> AzureCostSummary {
        let totalCost = records.reduce(Decimal(0)) { $0 + $1.costAmount }
        let currency = records.first?.currency ?? "USD"

        let dates = records.compactMap { $0.usageDate }.sorted()
        let period = DatePeriod(from: dates.first ?? "", to: dates.last ?? "")

        // Group by tenant
        var tenantCosts: [UUID: Decimal] = [:]
        for record in records {
            tenantCosts[record.azureTenantId, default: 0] += record.costAmount
        }

        let byTenant = tenantCosts.map { TenantCost(tenantId: $0.key, tenantName: "", cost: $0.value) }

        return AzureCostSummary(totalCost: totalCost, currency: currency, period: period, byTenant: byTenant)
    }
}

struct DatePeriod {
    let from: String
    let to: String
}

struct TenantCost: Identifiable {
    let tenantId: UUID
    let tenantName: String
    let cost: Decimal

    var id: UUID { tenantId }
}

struct DailyCost: Identifiable {
    let date: String
    let cost: Decimal

    var id: String { date }

    // Create daily costs from raw cost records
    static func from(records: [AzureCostRecord]) -> [DailyCost] {
        var dailyCosts: [String: Decimal] = [:]
        for record in records {
            dailyCosts[record.usageDate, default: 0] += record.costAmount
        }
        return dailyCosts
            .map { DailyCost(date: $0.key, cost: $0.value) }
            .sorted { $0.date < $1.date }
    }
}

struct ResourceGroupCost: Identifiable {
    let resourceGroup: String
    let cost: Decimal

    var id: String { resourceGroup }

    static func from(records: [AzureCostRecord]) -> [ResourceGroupCost] {
        var costs: [String: Decimal] = [:]
        for record in records {
            costs[record.resourceGroup, default: 0] += record.costAmount
        }
        return costs
            .map { ResourceGroupCost(resourceGroup: $0.key, cost: $0.value) }
            .sorted { $0.cost > $1.cost }
    }
}

struct CategoryCost: Identifiable {
    let category: String
    let cost: Decimal

    var id: String { category }

    static func from(records: [AzureCostRecord]) -> [CategoryCost] {
        var costs: [String: Decimal] = [:]
        for record in records {
            let category = record.meterCategory ?? "Unknown"
            costs[category, default: 0] += record.costAmount
        }
        return costs
            .map { CategoryCost(category: $0.key, cost: $0.value) }
            .sorted { $0.cost > $1.cost }
    }
}
