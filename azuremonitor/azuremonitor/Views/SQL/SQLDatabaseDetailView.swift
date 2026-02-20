import SwiftUI

struct SQLDatabaseDetailView: View {
    @StateObject private var viewModel: SQLDatabaseDetailViewModel
    @State private var selectedTab = 0

    init(databaseId: UUID) {
        _viewModel = StateObject(wrappedValue: SQLDatabaseDetailViewModel(databaseId: databaseId))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                if let database = viewModel.database {
                    // Status Hero with performance stats
                    databaseStatusHero(database)

                    // Tab Selection
                    Picker("View", selection: $selectedTab) {
                        Text("Insights").tag(0)
                        Text("Wait Stats").tag(1)
                        Text("Recommendations").tag(2)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, Spacing.lg)

                    // Tab Content
                    Group {
                        switch selectedTab {
                        case 0: queryInsightsSection
                        case 1: waitStatsSection
                        case 2: recommendationsSection
                        default: EmptyView()
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                }
            }
            .padding(.vertical, Spacing.lg)
        }
        .navigationTitle(viewModel.database?.name ?? "Database")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.loadAllData()
        }
        .task {
            await viewModel.loadIfNeeded()
        }
        .overlay {
            if viewModel.isLoading && viewModel.database == nil {
                LoadingView(message: "Loading database...")
            }
        }
    }

    private func databaseStatusHero(_ database: SQLDatabase) -> some View {
        VStack(spacing: Spacing.md) {
            Circle()
                .fill(database.status.color)
                .frame(width: 60, height: 60)
                .overlay {
                    Image(systemName: "cylinder.split.1x2")
                        .font(.title2)
                        .foregroundColor(.white)
                }

            Text(database.name)
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            Text(database.serverName)
                .font(.bodyMedium)
                .foregroundColor(.textSecondary)

            // Quick Stats from performance endpoint
            HStack(spacing: Spacing.xl) {
                VStack {
                    Text(formatPercent(viewModel.performance?.cpuPercent))
                        .font(.displaySmall)
                        .foregroundColor(.textPrimary)
                    Text("CPU")
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }

                VStack {
                    Text(formatPercent(viewModel.performance?.dtuPercent))
                        .font(.displaySmall)
                        .foregroundColor(.textPrimary)
                    Text("DTU")
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }

                VStack {
                    Text(formatPercent(viewModel.performance?.storagePercent))
                        .font(.displaySmall)
                        .foregroundColor(.textPrimary)
                    Text("Storage")
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }

                VStack {
                    Text("\(viewModel.performance?.connectionCount ?? 0)")
                        .font(.displaySmall)
                        .foregroundColor(.textPrimary)
                    Text("Connections")
                        .font(.labelSmall)
                        .foregroundColor(.textSecondary)
                }
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal, Spacing.lg)
    }

    private var queryInsightsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Query Insights")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            if viewModel.queryInsights.isEmpty {
                EmptyStateView(
                    icon: "text.magnifyingglass",
                    title: "No Queries",
                    message: "No query statistics available"
                )
            } else {
                ForEach(viewModel.queryInsights.prefix(10)) { insight in
                    SQLQueryInsightRow(insight: insight)
                }
            }
        }
    }

    private var waitStatsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Wait Statistics")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            if viewModel.waitStatistics.isEmpty {
                EmptyStateView(
                    icon: "clock",
                    title: "No Wait Statistics",
                    message: "No wait statistics available"
                )
            } else {
                ForEach(viewModel.waitStatistics.prefix(10)) { stat in
                    WaitStatRow(stat: stat)
                }
            }
        }
    }

    private var recommendationsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Recommendations")
                .font(.labelLarge)
                .foregroundColor(.textPrimary)

            if viewModel.recommendations.isEmpty {
                EmptyStateView(
                    icon: "checkmark.circle",
                    title: "No Recommendations",
                    message: "No optimization recommendations at this time"
                )
            } else {
                ForEach(viewModel.recommendations) { recommendation in
                    SQLRecommendationRow(recommendation: recommendation)
                }
            }
        }
    }

    private func formatPercent(_ value: Double?) -> String {
        guard let value = value else { return "--" }
        return String(format: "%.1f%%", value)
    }
}

struct SQLQueryInsightRow: View {
    let insight: SQLQueryInsight

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if let queryText = insight.queryText {
                Text(queryText.prefix(100) + (queryText.count > 100 ? "..." : ""))
                    .font(.monoMedium)
                    .foregroundColor(.textPrimary)
                    .lineLimit(2)
            }

            HStack(spacing: Spacing.lg) {
                if let count = insight.executionCount {
                    Label("\(count) executions", systemImage: "number")
                }
                if let avgCpu = insight.avgCpuTimeMs {
                    Label(String(format: "%.0fms avg", avgCpu), systemImage: "cpu")
                }
            }
            .font(.labelSmall)
            .foregroundColor(.textSecondary)
        }
        .padding(Spacing.md)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct WaitStatRow: View {
    let stat: SQLWaitStatistic

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(stat.waitType)
                    .font(.labelMedium)
                    .foregroundColor(.textPrimary)

                Text("\(stat.waitingTasksCount) waiting tasks")
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            Text(String(format: "%.0fms", stat.waitTimeMs))
                .font(.monoMedium)
                .foregroundColor(.textPrimary)
        }
        .padding(Spacing.md)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct SQLRecommendationRow: View {
    let recommendation: SQLRecommendation
    @State private var showDetails = false

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    if let type = recommendation.type {
                        Text(type)
                            .font(.labelMedium)
                            .foregroundColor(.textPrimary)
                    }

                    if let reason = recommendation.reason {
                        Text(reason)
                            .font(.bodySmall)
                            .foregroundColor(.textSecondary)
                            .lineLimit(2)
                    }
                }

                Spacer()

                if let impact = recommendation.impact {
                    Text(impact)
                        .font(.labelSmall)
                        .foregroundColor(impactColor(impact))
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xxs)
                        .background(impactColor(impact).opacity(0.15))
                        .clipShape(Capsule())
                }
            }

            if let estimatedImpact = recommendation.estimatedImpact {
                Text(String(format: "%.0f%% improvement", estimatedImpact))
                    .font(.labelSmall)
                    .foregroundColor(.statusUp)
            }

            if recommendation.script != nil || recommendation.details != nil {
                Button(action: { showDetails.toggle() }) {
                    Text(showDetails ? "Hide Details" : "Show Details")
                        .font(.labelSmall)
                        .foregroundColor(.brandPrimary)
                }
            }

            if showDetails {
                if let details = recommendation.details {
                    Text(details)
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                        .padding(Spacing.sm)
                        .background(Color.backgroundSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }

                if let script = recommendation.script {
                    Text(script)
                        .font(.monoMedium)
                        .foregroundColor(.textPrimary)
                        .padding(Spacing.sm)
                        .background(Color.backgroundSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
        }
        .padding(Spacing.md)
        .background(Color.backgroundTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func impactColor(_ impact: String) -> Color {
        switch impact.lowercased() {
        case "high": return .statusDown
        case "medium": return .statusDegraded
        case "low": return .statusUp
        default: return .textSecondary
        }
    }
}
