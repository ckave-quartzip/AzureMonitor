import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @State private var showRefreshError = false
    @State private var showRefreshSuccess = false
    @State private var lastRefreshTime: Date?

    var body: some View {
        NavigationStack {
            ScrollView {
                if viewModel.isLoading {
                    LoadingView(message: "Loading dashboard...")
                        .frame(maxWidth: .infinity, minHeight: 300)
                } else if let error = viewModel.error, viewModel.summary == nil {
                    ErrorView(error: error, retryAction: { Task { await viewModel.loadDashboard() } })
                } else if let summary = viewModel.summary {
                    VStack(spacing: Spacing.lg) {
                        // Refresh success banner
                        if showRefreshSuccess {
                            RefreshSuccessBanner(timestamp: lastRefreshTime)
                                .transition(.move(edge: .top).combined(with: .opacity))
                        }

                        SystemStatusBanner(summary: summary)
                        StatisticsCardsView(summary: summary)
                        ResourceHealthChart(status: summary.resourceStatus)
                        RecentChecksListView()
                    }
                    .padding(Spacing.lg)
                    .animation(.easeInOut(duration: 0.3), value: showRefreshSuccess)
                }
            }
            .navigationTitle("Dashboard")
            .refreshable {
                await viewModel.loadDashboard()
                if viewModel.refreshError != nil {
                    showRefreshError = true
                } else {
                    lastRefreshTime = Date()
                    showRefreshSuccess = true
                    // Auto-hide after 3 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                        withAnimation {
                            showRefreshSuccess = false
                        }
                    }
                }
            }
            .task {
                await viewModel.loadIfNeeded()
            }
            .onReceive(NotificationCenter.default.publisher(for: .alertsDidChange)) { _ in
                Task { await viewModel.loadDashboard() }
            }
            .alert("Refresh Failed", isPresented: $showRefreshError) {
                Button("OK", role: .cancel) {
                    viewModel.refreshError = nil
                }
                Button("Retry") {
                    Task { await viewModel.loadDashboard() }
                }
            } message: {
                Text(viewModel.refreshError?.localizedDescription ?? "Failed to refresh dashboard")
            }
        }
    }
}

// MARK: - Refresh Success Banner

struct RefreshSuccessBanner: View {
    let timestamp: Date?

    private var timeString: String {
        guard let timestamp = timestamp else { return "" }
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
    }

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.statusUp)

            Text("Dashboard refreshed")
                .font(.labelMedium)
                .foregroundColor(.textPrimary)

            if !timeString.isEmpty {
                Text("at \(timeString)")
                    .font(.labelSmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()
        }
        .padding(Spacing.md)
        .background(Color.statusUp.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - System Status Banner

struct SystemStatusBanner: View {
    let summary: DashboardSummary

    private var issueCount: Int {
        summary.activeAlertsCount +
        summary.openIncidentsCount +
        (summary.resourceStatus.down ?? 0) +
        (summary.resourceStatus.degraded ?? 0)
    }

    private var hasIssues: Bool {
        issueCount > 0
    }

    private var statusColor: Color {
        if summary.activeAlertsCount > 0 || (summary.resourceStatus.down ?? 0) > 0 {
            return .severityCritical
        } else if summary.openIncidentsCount > 0 || (summary.resourceStatus.degraded ?? 0) > 0 {
            return .severityWarning
        }
        return .statusUp
    }

    private var statusIcon: String {
        hasIssues ? "exclamationmark.triangle.fill" : "checkmark.shield.fill"
    }

    private var statusMessage: String {
        if !hasIssues {
            return "All systems operational"
        }

        var parts: [String] = []

        if summary.activeAlertsCount > 0 {
            parts.append("\(summary.activeAlertsCount) active alert\(summary.activeAlertsCount == 1 ? "" : "s")")
        }

        if summary.openIncidentsCount > 0 {
            parts.append("\(summary.openIncidentsCount) open incident\(summary.openIncidentsCount == 1 ? "" : "s")")
        }

        let downCount = summary.resourceStatus.down ?? 0
        if downCount > 0 {
            parts.append("\(downCount) resource\(downCount == 1 ? "" : "s") down")
        }

        let degradedCount = summary.resourceStatus.degraded ?? 0
        if degradedCount > 0 {
            parts.append("\(degradedCount) degraded")
        }

        return parts.joined(separator: " • ")
    }

    var body: some View {
        NavigationLink(destination: issueDestination) {
            HStack(spacing: Spacing.md) {
                // Status icon
                Image(systemName: statusIcon)
                    .font(.system(size: 24))
                    .foregroundColor(statusColor)

                VStack(alignment: .leading, spacing: 2) {
                    Text(hasIssues ? "Attention needed" : "System Status")
                        .font(.labelMedium)
                        .foregroundColor(.textSecondary)

                    Text(statusMessage)
                        .font(.bodyMedium)
                        .foregroundColor(.textPrimary)
                        .lineLimit(2)
                }

                Spacer()

                if hasIssues {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.textTertiary)
                }
            }
            .padding(Spacing.lg)
            .background(statusColor.opacity(0.1))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(statusColor.opacity(0.3), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .disabled(!hasIssues)
    }

    @ViewBuilder
    private var issueDestination: some View {
        // Navigate to the most critical issue type
        if summary.activeAlertsCount > 0 {
            AlertsListView(isEmbedded: true)
        } else if summary.openIncidentsCount > 0 {
            IncidentsListView(isEmbedded: true)
        } else {
            ResourcesListView(isEmbedded: true)
        }
    }
}

struct StatisticsCardsView: View {
    let summary: DashboardSummary

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.md) {
            NavigationLink(destination: ResourcesListView(isEmbedded: true)) {
                StatCard(
                    title: "Total Resources",
                    value: "\(summary.resourcesCount)",
                    icon: "server.rack",
                    tint: .brandPrimary
                )
            }
            .buttonStyle(.plain)

            NavigationLink(destination: ResourcesListView(isEmbedded: true)) {
                StatCard(
                    title: "Resources Up",
                    value: "\(summary.resourceStatus.up)",
                    icon: "checkmark.circle.fill",
                    tint: .statusUp
                )
            }
            .buttonStyle(.plain)

            NavigationLink(destination: ClientsListView(isEmbedded: true)) {
                StatCard(
                    title: "Clients",
                    value: "\(summary.clientsCount)",
                    icon: "building.2",
                    tint: .brandSecondary
                )
            }
            .buttonStyle(.plain)

            NavigationLink(destination: AlertsListView(isEmbedded: true)) {
                StatCard(
                    title: "Active Alerts",
                    value: "\(summary.activeAlertsCount)",
                    icon: "bell.fill",
                    tint: summary.activeAlertsCount > 0 ? .severityWarning : .statusUp
                )
            }
            .buttonStyle(.plain)

            NavigationLink(destination: IncidentsListView(isEmbedded: true)) {
                StatCard(
                    title: "Open Incidents",
                    value: "\(summary.openIncidentsCount)",
                    icon: "exclamationmark.triangle.fill",
                    tint: summary.openIncidentsCount > 0 ? .severityCritical : .statusUp
                )
            }
            .buttonStyle(.plain)

            NavigationLink(destination: ResourcesListView(isEmbedded: true)) {
                StatCard(
                    title: "Health",
                    value: String(format: "%.0f%%", summary.resourceStatus.healthyPercentage),
                    icon: "heart.fill",
                    tint: .statusUp
                )
            }
            .buttonStyle(.plain)
        }
    }
}

struct ResourceHealthChart: View {
    let status: ResourceStatusCounts

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Resource Health")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            HStack(spacing: Spacing.xl) {
                // Simple bar representation
                VStack(spacing: Spacing.sm) {
                    HealthBar(label: "Up", count: status.up, total: status.total, color: .statusUp)
                    HealthBar(label: "Down", count: status.down ?? 0, total: status.total, color: .statusDown)
                    HealthBar(label: "Degraded", count: status.degraded ?? 0, total: status.total, color: .statusDegraded)
                    HealthBar(label: "Unknown", count: status.unknown ?? 0, total: status.total, color: .statusUnknown)
                }

                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Label("\(status.up) Up", systemImage: "circle.fill")
                        .foregroundColor(.statusUp)
                        .font(.labelMedium)
                    if let down = status.down, down > 0 {
                        Label("\(down) Down", systemImage: "circle.fill")
                            .foregroundColor(.statusDown)
                            .font(.labelMedium)
                    }
                    if let degraded = status.degraded, degraded > 0 {
                        Label("\(degraded) Degraded", systemImage: "circle.fill")
                            .foregroundColor(.statusDegraded)
                            .font(.labelMedium)
                    }
                    if let unknown = status.unknown, unknown > 0 {
                        Label("\(unknown) Unknown", systemImage: "circle.fill")
                            .foregroundColor(.statusUnknown)
                            .font(.labelMedium)
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct HealthBar: View {
    let label: String
    let count: Int
    let total: Int
    let color: Color

    var body: some View {
        HStack(spacing: Spacing.xs) {
            Rectangle()
                .fill(color)
                .frame(width: max(CGFloat(count) / CGFloat(max(total, 1)) * 150, count > 0 ? 10 : 0), height: 16)
                .clipShape(RoundedRectangle(cornerRadius: 4))
            Spacer()
        }
    }
}

struct RecentChecksListView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Recent Activity")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text("Check results will appear here")
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
