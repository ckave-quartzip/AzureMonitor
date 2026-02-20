import WidgetKit
import SwiftUI

// MARK: - Resource Health Widget

struct ResourceHealthWidget: Widget {
    let kind: String = "ResourceHealthWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ResourceHealthProvider()) { entry in
            ResourceHealthWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Resource Health")
        .description("Shows health status of monitored resources.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Timeline Entry

struct ResourceHealthEntry: TimelineEntry {
    let date: Date
    let uptimePercentage: Double
    let healthyCount: Int
    let warningCount: Int
    let criticalCount: Int
    let unknownCount: Int
    let recentResources: [WidgetResource]

    var totalResources: Int {
        healthyCount + warningCount + criticalCount + unknownCount
    }

    static var placeholder: ResourceHealthEntry {
        ResourceHealthEntry(
            date: Date(),
            uptimePercentage: 99.5,
            healthyCount: 42,
            warningCount: 5,
            criticalCount: 1,
            unknownCount: 2,
            recentResources: [
                WidgetResource(name: "prod-api-server", status: .healthy, type: "Server"),
                WidgetResource(name: "staging-db", status: .warning, type: "Database"),
                WidgetResource(name: "payment-service", status: .critical, type: "Service"),
                WidgetResource(name: "cache-redis", status: .healthy, type: "Cache")
            ]
        )
    }
}

struct WidgetResource: Identifiable {
    let id = UUID()
    let name: String
    let status: WidgetResourceStatus
    let type: String
}

enum WidgetResourceStatus: String {
    case healthy, warning, critical, unknown

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

struct ResourceHealthProvider: TimelineProvider {
    func placeholder(in context: Context) -> ResourceHealthEntry {
        ResourceHealthEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (ResourceHealthEntry) -> Void) {
        completion(ResourceHealthEntry.placeholder)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ResourceHealthEntry>) -> Void) {
        Task {
            let entry = await fetchResourceHealthData()
            let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
            let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
            completion(timeline)
        }
    }

    private func fetchResourceHealthData() async -> ResourceHealthEntry {
        let sharedDefaults = UserDefaults(suiteName: "group.com.quartz.monitor")

        let healthyCount = sharedDefaults?.integer(forKey: "widget.healthyResources") ?? 0
        let warningCount = sharedDefaults?.integer(forKey: "widget.warningResources") ?? 0
        let criticalCount = sharedDefaults?.integer(forKey: "widget.criticalResources") ?? 0
        let unknownCount = sharedDefaults?.integer(forKey: "widget.unknownResources") ?? 0
        let uptimePercentage = sharedDefaults?.double(forKey: "widget.uptimePercentage") ?? 0

        // Get recent resources from shared storage
        var recentResources: [WidgetResource] = []
        if let resourcesData = sharedDefaults?.data(forKey: "widget.recentResources"),
           let resources = try? JSONDecoder().decode([WidgetResourceData].self, from: resourcesData) {
            recentResources = resources.prefix(5).map { data in
                WidgetResource(
                    name: data.name,
                    status: WidgetResourceStatus(rawValue: data.status) ?? .unknown,
                    type: data.type
                )
            }
        }

        return ResourceHealthEntry(
            date: Date(),
            uptimePercentage: uptimePercentage,
            healthyCount: healthyCount,
            warningCount: warningCount,
            criticalCount: criticalCount,
            unknownCount: unknownCount,
            recentResources: recentResources
        )
    }
}

struct WidgetResourceData: Codable {
    let name: String
    let status: String
    let type: String
}

// MARK: - Widget Views

struct ResourceHealthWidgetEntryView: View {
    var entry: ResourceHealthEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallResourceHealthView(entry: entry)
        case .systemMedium:
            MediumResourceHealthView(entry: entry)
        case .systemLarge:
            LargeResourceHealthView(entry: entry)
        default:
            SmallResourceHealthView(entry: entry)
        }
    }
}

struct SmallResourceHealthView: View {
    let entry: ResourceHealthEntry

    var body: some View {
        VStack(spacing: 8) {
            // Uptime percentage
            Text(String(format: "%.1f%%", entry.uptimePercentage))
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(uptimeColor)

            Text("Uptime")
                .font(.caption)
                .foregroundColor(.secondary)

            // Resource counts
            HStack(spacing: 6) {
                StatusDot(color: .green, count: entry.healthyCount)
                StatusDot(color: .orange, count: entry.warningCount)
                StatusDot(color: .red, count: entry.criticalCount)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var uptimeColor: Color {
        if entry.uptimePercentage >= 99.9 {
            return .green
        } else if entry.uptimePercentage >= 99.0 {
            return .orange
        } else {
            return .red
        }
    }
}

struct StatusDot: View {
    let color: Color
    let count: Int

    var body: some View {
        HStack(spacing: 2) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text("\(count)")
                .font(.caption2)
                .fontWeight(.medium)
        }
    }
}

struct MediumResourceHealthView: View {
    let entry: ResourceHealthEntry

    var body: some View {
        HStack(spacing: 16) {
            // Left side - uptime gauge
            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .stroke(Color.gray.opacity(0.2), lineWidth: 8)
                        .frame(width: 60, height: 60)

                    Circle()
                        .trim(from: 0, to: entry.uptimePercentage / 100)
                        .stroke(uptimeColor, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                        .frame(width: 60, height: 60)
                        .rotationEffect(.degrees(-90))

                    Text(String(format: "%.0f%%", entry.uptimePercentage))
                        .font(.caption)
                        .fontWeight(.bold)
                }

                Text("Uptime")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            // Right side - resource breakdown
            VStack(alignment: .leading, spacing: 4) {
                Text("\(entry.totalResources) Resources")
                    .font(.caption)
                    .fontWeight(.semibold)

                ResourceHealthBar(
                    healthy: entry.healthyCount,
                    warning: entry.warningCount,
                    critical: entry.criticalCount,
                    unknown: entry.unknownCount
                )
                .frame(height: 8)

                HStack(spacing: 12) {
                    LegendItem(color: .green, label: "Healthy", count: entry.healthyCount)
                    LegendItem(color: .orange, label: "Warning", count: entry.warningCount)
                    LegendItem(color: .red, label: "Critical", count: entry.criticalCount)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
    }

    private var uptimeColor: Color {
        if entry.uptimePercentage >= 99.9 { return .green }
        else if entry.uptimePercentage >= 99.0 { return .orange }
        else { return .red }
    }
}

struct ResourceHealthBar: View {
    let healthy: Int
    let warning: Int
    let critical: Int
    let unknown: Int

    var total: Int { healthy + warning + critical + unknown }

    var body: some View {
        GeometryReader { geometry in
            HStack(spacing: 1) {
                if healthy > 0 {
                    Rectangle()
                        .fill(Color.green)
                        .frame(width: geometry.size.width * CGFloat(healthy) / CGFloat(total))
                }
                if warning > 0 {
                    Rectangle()
                        .fill(Color.orange)
                        .frame(width: geometry.size.width * CGFloat(warning) / CGFloat(total))
                }
                if critical > 0 {
                    Rectangle()
                        .fill(Color.red)
                        .frame(width: geometry.size.width * CGFloat(critical) / CGFloat(total))
                }
                if unknown > 0 {
                    Rectangle()
                        .fill(Color.gray)
                        .frame(width: geometry.size.width * CGFloat(unknown) / CGFloat(total))
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }
}

struct LegendItem: View {
    let color: Color
    let label: String
    let count: Int

    var body: some View {
        HStack(spacing: 2) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text("\(count)")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
}

struct LargeResourceHealthView: View {
    let entry: ResourceHealthEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading) {
                    Text("Resource Health")
                        .font(.headline)
                    Text("\(entry.totalResources) monitored")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text(String(format: "%.1f%%", entry.uptimePercentage))
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(entry.uptimePercentage >= 99.0 ? .green : .orange)
                    Text("Uptime")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            // Health bar
            ResourceHealthBar(
                healthy: entry.healthyCount,
                warning: entry.warningCount,
                critical: entry.criticalCount,
                unknown: entry.unknownCount
            )
            .frame(height: 12)

            // Legend
            HStack(spacing: 16) {
                LegendItem(color: .green, label: "Healthy", count: entry.healthyCount)
                LegendItem(color: .orange, label: "Warning", count: entry.warningCount)
                LegendItem(color: .red, label: "Critical", count: entry.criticalCount)
                LegendItem(color: .gray, label: "Unknown", count: entry.unknownCount)
            }

            Divider()

            // Recent resources list
            Text("Resources")
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)

            if entry.recentResources.isEmpty {
                Text("No resources available")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                ForEach(entry.recentResources.prefix(5)) { resource in
                    HStack {
                        Image(systemName: resource.status.icon)
                            .font(.caption)
                            .foregroundColor(resource.status.color)

                        VStack(alignment: .leading, spacing: 0) {
                            Text(resource.name)
                                .font(.caption)
                                .lineLimit(1)
                            Text(resource.type)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }

                        Spacer()
                    }
                }
            }
        }
        .padding()
    }
}

// MARK: - Preview

#Preview(as: .systemLarge) {
    ResourceHealthWidget()
} timeline: {
    ResourceHealthEntry.placeholder
}
