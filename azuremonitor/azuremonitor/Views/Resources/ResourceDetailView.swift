import SwiftUI

struct ResourceDetailView: View {
    @StateObject private var viewModel: ResourceDetailViewModel

    init(resourceId: UUID) {
        _viewModel = StateObject(wrappedValue: ResourceDetailViewModel(resourceId: resourceId))
    }

    var body: some View {
        ScrollView {
            if viewModel.isLoading {
                LoadingView(message: "Loading details...")
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error {
                ErrorView(error: error, retryAction: { Task { await viewModel.loadDetails() } })
            } else if let resource = viewModel.resource {
                VStack(spacing: Spacing.lg) {
                    ResourceStatusHero(resource: resource, status: viewModel.status)

                    if let uptime = viewModel.uptime {
                        UptimeStatsView(uptime: uptime)
                    }

                    if !viewModel.monitoringChecks.isEmpty {
                        MonitoringChecksSection(checks: viewModel.monitoringChecks)
                    }

                    ResourceInfoSection(resource: resource)
                }
                .padding(Spacing.lg)
            }
        }
        .navigationTitle(viewModel.resource?.name ?? "Resource")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadDetails()
        }
        .task {
            await viewModel.loadIfNeeded()
        }
    }
}

struct ResourceStatusHero: View {
    let resource: Resource
    let status: ResourceStatusResponse?

    var body: some View {
        VStack(spacing: Spacing.md) {
            Circle()
                .fill(resource.status.color)
                .frame(width: 80, height: 80)
                .overlay(
                    Image(systemName: resource.status == .up ? "checkmark" : "xmark")
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.white)
                )

            Text(resource.status.displayName)
                .font(.displayMedium)
                .foregroundColor(resource.status.color)

            if let lastChecked = resource.lastCheckedAt {
                Text("Last checked \(lastChecked.timeAgo)")
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.xl)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct UptimeStatsView: View {
    let uptime: ResourceUptimeResponse

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Uptime")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            HStack(spacing: Spacing.md) {
                UptimeStatBox(label: "24h", value: uptime.uptime24h)
                UptimeStatBox(label: "7d", value: uptime.uptime7d)
                UptimeStatBox(label: "30d", value: uptime.uptime30d)
                UptimeStatBox(label: "90d", value: uptime.uptime90d)
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct UptimeStatBox: View {
    let label: String
    let value: Double

    var body: some View {
        VStack(spacing: Spacing.xs) {
            Text(String(format: "%.1f%%", value))
                .font(.monoLarge)
                .foregroundColor(value >= 99 ? .statusUp : value >= 95 ? .statusDegraded : .statusDown)
            Text(label)
                .font(.labelSmall)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(Spacing.md)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct MonitoringChecksSection: View {
    let checks: [MonitoringCheck]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("Monitoring")
                    .font(.displaySmall)
                    .foregroundColor(.textPrimary)

                Spacer()

                Text("\(checks.count) check\(checks.count == 1 ? "" : "s")")
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }

            VStack(spacing: Spacing.sm) {
                ForEach(checks) { check in
                    NavigationLink(destination: MonitoringCheckDetailView(check: check)) {
                        MonitoringCheckRow(check: check)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct MonitoringCheckRow: View {
    let check: MonitoringCheck

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Status indicator
            Circle()
                .fill(check.isEnabled ? Color.statusUp : Color.textTertiary)
                .frame(width: 10, height: 10)

            // Check type icon
            Image(systemName: checkTypeIcon)
                .font(.system(size: 14))
                .foregroundColor(.brandPrimary)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(check.name)
                    .font(.bodyMedium)
                    .foregroundColor(.textPrimary)

                HStack(spacing: Spacing.xs) {
                    Text(check.checkType.uppercased())
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)

                    Text("•")
                        .foregroundColor(.textTertiary)

                    Text("Every \(formatInterval(check.interval))")
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }
            }

            Spacer()

            // Enabled/Disabled badge
            Text(check.isEnabled ? "Active" : "Paused")
                .font(.labelSmall)
                .foregroundColor(check.isEnabled ? .statusUp : .textTertiary)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xxs)
                .background((check.isEnabled ? Color.statusUp : Color.textTertiary).opacity(0.15))
                .clipShape(Capsule())

            // Chevron to indicate tappable
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.textTertiary)
        }
        .padding(Spacing.sm)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var checkTypeIcon: String {
        switch check.checkType.lowercased() {
        case "http", "https": return "globe"
        case "ping", "icmp": return "antenna.radiowaves.left.and.right"
        case "tcp", "port": return "network"
        case "dns": return "server.rack"
        case "ssl", "certificate": return "lock.shield"
        default: return "checkmark.circle"
        }
    }

    private func formatInterval(_ seconds: Int) -> String {
        if seconds < 60 {
            return "\(seconds)s"
        } else if seconds < 3600 {
            let minutes = seconds / 60
            return "\(minutes)m"
        } else {
            let hours = seconds / 3600
            return "\(hours)h"
        }
    }
}

struct ResourceInfoSection: View {
    let resource: Resource

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Details")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            VStack(spacing: Spacing.sm) {
                InfoRow(label: "Type", value: resource.resourceType.displayName, icon: resource.resourceType.icon)

                if let url = resource.url {
                    InfoRow(label: "URL", value: url, icon: "link")
                }

                if let description = resource.description {
                    InfoRow(label: "Description", value: description, icon: "doc.text")
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct InfoRow: View {
    let label: String
    let value: String
    let icon: String

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.textTertiary)
                .frame(width: 20)

            Text(label)
                .font(.labelMedium)
                .foregroundColor(.textSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .foregroundColor(.textPrimary)
                .lineLimit(1)
        }
    }
}
