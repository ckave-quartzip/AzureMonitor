import WidgetKit
import SwiftUI

// MARK: - Alerts Widget

struct AlertsWidget: Widget {
    let kind: String = "AlertsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AlertsProvider()) { entry in
            AlertsWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Active Alerts")
        .description("Shows count of active alerts by severity.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}

// MARK: - Timeline Entry

struct AlertsEntry: TimelineEntry {
    let date: Date
    let criticalCount: Int
    let warningCount: Int
    let infoCount: Int
    let totalAlerts: Int
    let recentAlerts: [WidgetAlert]

    static var placeholder: AlertsEntry {
        AlertsEntry(
            date: Date(),
            criticalCount: 2,
            warningCount: 5,
            infoCount: 3,
            totalAlerts: 10,
            recentAlerts: [
                WidgetAlert(title: "High CPU Usage", severity: .critical, time: "2m ago"),
                WidgetAlert(title: "Memory Warning", severity: .warning, time: "15m ago"),
                WidgetAlert(title: "Disk Space Low", severity: .warning, time: "1h ago")
            ]
        )
    }
}

struct WidgetAlert: Identifiable {
    let id = UUID()
    let title: String
    let severity: WidgetAlertSeverity
    let time: String
}

enum WidgetAlertSeverity: String {
    case critical, warning, info

    var color: Color {
        switch self {
        case .critical: return .red
        case .warning: return .orange
        case .info: return .blue
        }
    }

    var icon: String {
        switch self {
        case .critical: return "exclamationmark.octagon.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .info: return "info.circle.fill"
        }
    }
}

// MARK: - Timeline Provider

struct AlertsProvider: TimelineProvider {
    func placeholder(in context: Context) -> AlertsEntry {
        AlertsEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (AlertsEntry) -> Void) {
        completion(AlertsEntry.placeholder)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AlertsEntry>) -> Void) {
        Task {
            let entry = await fetchAlertsData()
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    private func fetchAlertsData() async -> AlertsEntry {
        let sharedDefaults = UserDefaults(suiteName: "group.com.quartz.monitor")

        let criticalCount = sharedDefaults?.integer(forKey: "widget.criticalAlerts") ?? 0
        let warningCount = sharedDefaults?.integer(forKey: "widget.warningAlerts") ?? 0
        let infoCount = sharedDefaults?.integer(forKey: "widget.infoAlerts") ?? 0
        let totalAlerts = criticalCount + warningCount + infoCount

        // Get recent alerts from shared storage
        var recentAlerts: [WidgetAlert] = []
        if let alertsData = sharedDefaults?.data(forKey: "widget.recentAlerts"),
           let alerts = try? JSONDecoder().decode([WidgetAlertData].self, from: alertsData) {
            recentAlerts = alerts.prefix(3).map { data in
                WidgetAlert(
                    title: data.title,
                    severity: WidgetAlertSeverity(rawValue: data.severity) ?? .info,
                    time: data.timeAgo
                )
            }
        }

        return AlertsEntry(
            date: Date(),
            criticalCount: criticalCount,
            warningCount: warningCount,
            infoCount: infoCount,
            totalAlerts: totalAlerts,
            recentAlerts: recentAlerts
        )
    }
}

struct WidgetAlertData: Codable {
    let title: String
    let severity: String
    let timeAgo: String
}

// MARK: - Widget Views

struct AlertsWidgetEntryView: View {
    var entry: AlertsEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallAlertsView(entry: entry)
        case .systemMedium:
            MediumAlertsView(entry: entry)
        case .accessoryRectangular:
            RectangularAlertsView(entry: entry)
        case .accessoryCircular:
            CircularAlertsView(entry: entry)
        default:
            SmallAlertsView(entry: entry)
        }
    }
}

struct SmallAlertsView: View {
    let entry: AlertsEntry

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "bell.badge.fill")
                    .foregroundColor(.orange)
                Text("Alerts")
                    .font(.caption)
                    .fontWeight(.semibold)
            }

            Text("\(entry.totalAlerts)")
                .font(.system(size: 40, weight: .bold))
                .foregroundColor(entry.criticalCount > 0 ? .red : (entry.warningCount > 0 ? .orange : .green))

            HStack(spacing: 12) {
                AlertCountBadge(count: entry.criticalCount, color: .red)
                AlertCountBadge(count: entry.warningCount, color: .orange)
                AlertCountBadge(count: entry.infoCount, color: .blue)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct AlertCountBadge: View {
    let count: Int
    let color: Color

    var body: some View {
        Text("\(count)")
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color)
            .clipShape(Capsule())
    }
}

struct MediumAlertsView: View {
    let entry: AlertsEntry

    var body: some View {
        HStack(spacing: 16) {
            // Alert counts
            VStack(spacing: 6) {
                Text("\(entry.totalAlerts)")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(entry.criticalCount > 0 ? .red : (entry.warningCount > 0 ? .orange : .green))

                Text("Active Alerts")
                    .font(.caption)
                    .foregroundColor(.secondary)

                HStack(spacing: 8) {
                    AlertCountBadge(count: entry.criticalCount, color: .red)
                    AlertCountBadge(count: entry.warningCount, color: .orange)
                    AlertCountBadge(count: entry.infoCount, color: .blue)
                }
            }
            .frame(maxWidth: .infinity)

            Divider()

            // Recent alerts
            VStack(alignment: .leading, spacing: 4) {
                Text("Recent")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)

                if entry.recentAlerts.isEmpty {
                    Text("No alerts")
                        .font(.caption)
                        .foregroundColor(.secondary)
                } else {
                    ForEach(entry.recentAlerts.prefix(3)) { alert in
                        HStack(spacing: 4) {
                            Circle()
                                .fill(alert.severity.color)
                                .frame(width: 6, height: 6)

                            Text(alert.title)
                                .font(.caption2)
                                .lineLimit(1)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
    }
}

struct RectangularAlertsView: View {
    let entry: AlertsEntry

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Alerts")
                    .font(.caption2)
                    .foregroundColor(.secondary)

                Text("\(entry.totalAlerts) active")
                    .font(.headline)
            }

            Spacer()

            HStack(spacing: 4) {
                if entry.criticalCount > 0 {
                    Image(systemName: "exclamationmark.octagon.fill")
                        .foregroundColor(.red)
                    Text("\(entry.criticalCount)")
                        .font(.caption)
                }
                if entry.warningCount > 0 {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text("\(entry.warningCount)")
                        .font(.caption)
                }
            }
        }
    }
}

struct CircularAlertsView: View {
    let entry: AlertsEntry

    var body: some View {
        ZStack {
            if entry.criticalCount > 0 {
                Circle()
                    .stroke(Color.red, lineWidth: 3)
            } else if entry.warningCount > 0 {
                Circle()
                    .stroke(Color.orange, lineWidth: 3)
            } else {
                Circle()
                    .stroke(Color.green, lineWidth: 3)
            }

            VStack(spacing: 0) {
                Image(systemName: "bell.fill")
                    .font(.caption)
                Text("\(entry.totalAlerts)")
                    .font(.system(size: 18, weight: .bold))
            }
        }
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    AlertsWidget()
} timeline: {
    AlertsEntry.placeholder
}
