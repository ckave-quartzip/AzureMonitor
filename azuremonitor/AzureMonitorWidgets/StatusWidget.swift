import WidgetKit
import SwiftUI

// MARK: - Status Widget

struct StatusWidget: Widget {
    let kind: String = "StatusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StatusProvider()) { entry in
            StatusWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("System Status")
        .description("Shows overall system health status.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Timeline Entry

struct StatusEntry: TimelineEntry {
    let date: Date
    let status: SystemStatus
    let healthyCount: Int
    let warningCount: Int
    let criticalCount: Int
    let totalResources: Int

    static var placeholder: StatusEntry {
        StatusEntry(
            date: Date(),
            status: .healthy,
            healthyCount: 45,
            warningCount: 3,
            criticalCount: 0,
            totalResources: 48
        )
    }
}

enum SystemStatus: String {
    case healthy = "Healthy"
    case warning = "Warning"
    case critical = "Critical"
    case unknown = "Unknown"

    var color: Color {
        switch self {
        case .healthy: return .green
        case .warning: return .orange
        case .critical: return .red
        case .unknown: return .gray
        }
    }

    var icon: String {
        switch self {
        case .healthy: return "checkmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .critical: return "xmark.circle.fill"
        case .unknown: return "questionmark.circle.fill"
        }
    }
}

// MARK: - Timeline Provider

struct StatusProvider: TimelineProvider {
    func placeholder(in context: Context) -> StatusEntry {
        StatusEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (StatusEntry) -> Void) {
        let entry = StatusEntry.placeholder
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StatusEntry>) -> Void) {
        Task {
            let entry = await fetchStatusData()
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    private func fetchStatusData() async -> StatusEntry {
        // Try to fetch from shared app group storage or API
        // For now, use cached data from UserDefaults shared with main app
        let sharedDefaults = UserDefaults(suiteName: "group.com.quartz.monitor")

        let healthyCount = sharedDefaults?.integer(forKey: "widget.healthyResources") ?? 0
        let warningCount = sharedDefaults?.integer(forKey: "widget.warningResources") ?? 0
        let criticalCount = sharedDefaults?.integer(forKey: "widget.criticalResources") ?? 0
        let totalResources = healthyCount + warningCount + criticalCount

        let status: SystemStatus
        if criticalCount > 0 {
            status = .critical
        } else if warningCount > 0 {
            status = .warning
        } else if healthyCount > 0 {
            status = .healthy
        } else {
            status = .unknown
        }

        return StatusEntry(
            date: Date(),
            status: status,
            healthyCount: healthyCount,
            warningCount: warningCount,
            criticalCount: criticalCount,
            totalResources: totalResources
        )
    }
}

// MARK: - Widget Views

struct StatusWidgetEntryView: View {
    var entry: StatusEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallStatusView(entry: entry)
        case .systemMedium:
            MediumStatusView(entry: entry)
        default:
            SmallStatusView(entry: entry)
        }
    }
}

struct SmallStatusView: View {
    let entry: StatusEntry

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: entry.status.icon)
                .font(.system(size: 32))
                .foregroundColor(entry.status.color)

            Text(entry.status.rawValue)
                .font(.headline)
                .fontWeight(.semibold)

            Text("\(entry.totalResources) Resources")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct MediumStatusView: View {
    let entry: StatusEntry

    var body: some View {
        HStack(spacing: 16) {
            // Status indicator
            VStack(spacing: 8) {
                Image(systemName: entry.status.icon)
                    .font(.system(size: 40))
                    .foregroundColor(entry.status.color)

                Text(entry.status.rawValue)
                    .font(.headline)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)

            // Resource counts
            VStack(alignment: .leading, spacing: 4) {
                ResourceCountRow(icon: "checkmark.circle.fill", color: .green, label: "Healthy", count: entry.healthyCount)
                ResourceCountRow(icon: "exclamationmark.triangle.fill", color: .orange, label: "Warning", count: entry.warningCount)
                ResourceCountRow(icon: "xmark.circle.fill", color: .red, label: "Critical", count: entry.criticalCount)
            }
            .frame(maxWidth: .infinity)
        }
        .padding()
    }
}

struct ResourceCountRow: View {
    let icon: String
    let color: Color
    let label: String
    let count: Int

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(color)

            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)

            Spacer()

            Text("\(count)")
                .font(.caption)
                .fontWeight(.semibold)
        }
    }
}

// MARK: - Preview

#Preview(as: .systemSmall) {
    StatusWidget()
} timeline: {
    StatusEntry.placeholder
    StatusEntry(date: Date(), status: .warning, healthyCount: 40, warningCount: 5, criticalCount: 0, totalResources: 45)
    StatusEntry(date: Date(), status: .critical, healthyCount: 38, warningCount: 4, criticalCount: 2, totalResources: 44)
}
