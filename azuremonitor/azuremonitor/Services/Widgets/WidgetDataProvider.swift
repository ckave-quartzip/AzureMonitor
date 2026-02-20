import Foundation
import WidgetKit

class WidgetDataProvider {
    static let shared = WidgetDataProvider()

    private let sharedDefaults = UserDefaults(suiteName: "group.com.quartz.monitor")
    private let encoder = JSONEncoder()

    private init() {}

    // MARK: - Update Widget Data

    func updateDashboardData(
        healthyResources: Int,
        warningResources: Int,
        criticalResources: Int,
        unknownResources: Int,
        uptimePercentage: Double
    ) {
        sharedDefaults?.set(healthyResources, forKey: "widget.healthyResources")
        sharedDefaults?.set(warningResources, forKey: "widget.warningResources")
        sharedDefaults?.set(criticalResources, forKey: "widget.criticalResources")
        sharedDefaults?.set(unknownResources, forKey: "widget.unknownResources")
        sharedDefaults?.set(uptimePercentage, forKey: "widget.uptimePercentage")

        reloadWidgets()
    }

    func updateAlertsData(
        criticalCount: Int,
        warningCount: Int,
        infoCount: Int,
        recentAlerts: [AlertWidgetData]
    ) {
        sharedDefaults?.set(criticalCount, forKey: "widget.criticalAlerts")
        sharedDefaults?.set(warningCount, forKey: "widget.warningAlerts")
        sharedDefaults?.set(infoCount, forKey: "widget.infoAlerts")

        if let data = try? encoder.encode(recentAlerts) {
            sharedDefaults?.set(data, forKey: "widget.recentAlerts")
        }

        reloadWidgets()
    }

    func updateRecentResources(_ resources: [ResourceWidgetData]) {
        if let data = try? encoder.encode(resources) {
            sharedDefaults?.set(data, forKey: "widget.recentResources")
        }

        reloadWidgets()
    }

    // MARK: - Convenience Methods

    func updateFromDashboardSummary(_ summary: DashboardSummary) {
        updateDashboardData(
            healthyResources: summary.resourceStatus.up,
            warningResources: summary.resourceStatus.degraded ?? 0,
            criticalResources: summary.resourceStatus.down ?? 0,
            unknownResources: summary.resourceStatus.unknown ?? 0,
            uptimePercentage: summary.resourceStatus.healthyPercentage
        )
    }

    func updateFromAlerts(_ alerts: [Alert]) {
        var criticalCount = 0
        var warningCount = 0
        var infoCount = 0

        for alert in alerts where alert.status == .active {
            switch alert.severity {
            case .critical: criticalCount += 1
            case .warning: warningCount += 1
            case .info: infoCount += 1
            }
        }

        let recentAlerts = alerts.prefix(5).map { alert in
            AlertWidgetData(
                title: alert.title,
                severity: alert.severity.rawValue,
                timeAgo: alert.triggeredAt.timeAgo
            )
        }

        updateAlertsData(
            criticalCount: criticalCount,
            warningCount: warningCount,
            infoCount: infoCount,
            recentAlerts: Array(recentAlerts)
        )
    }

    func updateFromResources(_ resources: [Resource]) {
        let resourceData = resources.prefix(10).map { resource in
            ResourceWidgetData(
                name: resource.name,
                status: resource.status.rawValue,
                type: resource.resourceType.displayName
            )
        }

        updateRecentResources(Array(resourceData))
    }

    // MARK: - Widget Reload

    private func reloadWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }

    func reloadStatusWidget() {
        WidgetCenter.shared.reloadTimelines(ofKind: "StatusWidget")
    }

    func reloadAlertsWidget() {
        WidgetCenter.shared.reloadTimelines(ofKind: "AlertsWidget")
    }

    func reloadResourceHealthWidget() {
        WidgetCenter.shared.reloadTimelines(ofKind: "ResourceHealthWidget")
    }
}

// MARK: - Widget Data Models

struct AlertWidgetData: Codable {
    let title: String
    let severity: String
    let timeAgo: String
}

struct ResourceWidgetData: Codable {
    let name: String
    let status: String
    let type: String
}
