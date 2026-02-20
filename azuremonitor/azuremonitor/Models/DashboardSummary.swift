import Foundation

struct DashboardSummary: Codable {
    let clientsCount: Int
    let resourcesCount: Int
    let activeAlertsCount: Int
    let openIncidentsCount: Int
    let resourceStatus: ResourceStatusCounts

    enum CodingKeys: String, CodingKey {
        case clientsCount = "clients_count"
        case resourcesCount = "resources_count"
        case activeAlertsCount = "active_alerts_count"
        case openIncidentsCount = "open_incidents_count"
        case resourceStatus = "resource_status"
    }
}

struct ResourceStatusCounts: Codable {
    let up: Int
    let down: Int?
    let degraded: Int?
    let unknown: Int?

    // Computed properties for convenience
    var total: Int {
        up + (down ?? 0) + (degraded ?? 0) + (unknown ?? 0)
    }

    var healthyPercentage: Double {
        guard total > 0 else { return 0 }
        return Double(up) / Double(total) * 100
    }
}
