import SwiftUI

struct SQLOverviewView: View {
    @StateObject private var viewModel = SQLOverviewViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Health Score Card
                healthScoreCard

                // Quick Stats
                statsGrid

                // Issues Section
                if !viewModel.highCPUDatabases.isEmpty || !viewModel.highStorageDatabases.isEmpty {
                    issuesSection
                }

                // Databases List
                databasesSection
            }
            .padding(Spacing.lg)
        }
        .navigationTitle("SQL Monitoring")
        .searchable(text: $viewModel.searchText, prompt: "Search databases...")
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            await viewModel.loadIfNeeded()
        }
        .overlay {
            if viewModel.isLoading && viewModel.databases.isEmpty {
                LoadingView(message: "Loading databases...")
            }
        }
    }

    private var healthScoreCard: some View {
        VStack(spacing: Spacing.md) {
            Text("SQL Health Score")
                .font(.labelLarge)
                .foregroundColor(.textSecondary)

            ZStack {
                Circle()
                    .stroke(Color.backgroundSecondary, lineWidth: 12)
                    .frame(width: 120, height: 120)

                Circle()
                    .trim(from: 0, to: CGFloat(viewModel.averageHealthScore) / 100)
                    .stroke(healthScoreColor, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .frame(width: 120, height: 120)
                    .rotationEffect(.degrees(-90))

                VStack(spacing: Spacing.xxs) {
                    Text("\(viewModel.averageHealthScore)")
                        .font(.displayLarge)
                        .foregroundColor(.textPrimary)
                    Text("/ 100")
                        .font(.labelSmall)
                        .foregroundColor(.textTertiary)
                }
            }
        }
        .padding(Spacing.xl)
        .frame(maxWidth: .infinity)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var healthScoreColor: Color {
        switch viewModel.averageHealthScore {
        case 80...100: return .statusUp
        case 50...79: return .statusDegraded
        default: return .statusDown
        }
    }

    private var statsGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: Spacing.md) {
            StatCard(
                title: "Total Databases",
                value: "\(viewModel.totalDatabases)",
                icon: "cylinder.split.1x2",
                tint: .brandPrimary
            )

            StatCard(
                title: "Avg CPU",
                value: String(format: "%.1f%%", viewModel.averageCpuPercent),
                icon: "cpu",
                tint: viewModel.averageCpuPercent > 80 ? .statusDegraded : .statusUp
            )

            StatCard(
                title: "Avg DTU",
                value: String(format: "%.1f%%", viewModel.averageDtuPercent),
                icon: "gauge.with.dots.needle.bottom.50percent",
                tint: viewModel.averageDtuPercent > 80 ? .statusDegraded : .statusUp
            )

            StatCard(
                title: "Avg Storage",
                value: String(format: "%.1f%%", viewModel.averageStoragePercent),
                icon: "internaldrive",
                tint: viewModel.averageStoragePercent > 80 ? .statusDegraded : .statusUp
            )
        }
    }

    private var issuesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Issues")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            ForEach(viewModel.highCPUDatabases) { database in
                IssueRow(
                    icon: "cpu",
                    title: "\(database.name) - High CPU",
                    detail: String(format: "%.1f%% CPU usage", database.latestStats?.cpuPercent ?? 0),
                    color: .statusDegraded
                )
            }

            ForEach(viewModel.highStorageDatabases) { database in
                IssueRow(
                    icon: "internaldrive",
                    title: "\(database.name) - High Storage",
                    detail: String(format: "%.1f%% storage used", database.latestStats?.storagePercent ?? 0),
                    color: .statusDegraded
                )
            }
        }
        .padding(Spacing.lg)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var databasesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Databases")
                .font(.displaySmall)
                .foregroundColor(.textPrimary)

            if viewModel.filteredDatabases.isEmpty {
                EmptyStateView(
                    icon: "cylinder.split.1x2",
                    title: "No Databases Found",
                    message: "No SQL databases match your search criteria"
                )
            } else {
                ForEach(viewModel.filteredDatabases) { database in
                    NavigationLink(destination: SQLDatabaseDetailView(databaseId: database.id)) {
                        SQLDatabaseRow(database: database)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

struct SQLDatabaseRow: View {
    let database: SQLDatabaseOverview

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(statusColor)
                .frame(width: 12, height: 12)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(database.name)
                    .font(.labelLarge)
                    .foregroundColor(.textPrimary)

                if let location = database.location {
                    Text(location)
                        .font(.bodySmall)
                        .foregroundColor(.textSecondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: Spacing.xxs) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "cpu")
                        .font(.caption)
                    Text(cpuText)
                        .font(.labelSmall)
                }
                .foregroundColor(cpuColor)

                HStack(spacing: Spacing.xs) {
                    Image(systemName: "internaldrive")
                        .font(.caption)
                    Text(storageText)
                        .font(.labelSmall)
                }
                .foregroundColor(storageColor)
            }

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.textTertiary)
        }
        .padding(Spacing.md)
        .background(Color.backgroundSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var statusColor: Color {
        let score = database.optimizationScore ?? 100
        if score >= 80 { return .statusUp }
        if score >= 50 { return .statusDegraded }
        return .statusDown
    }

    private var cpuText: String {
        guard let cpu = database.latestStats?.cpuPercent else { return "--" }
        return String(format: "%.0f%%", cpu)
    }

    private var storageText: String {
        guard let storage = database.latestStats?.storagePercent else { return "--" }
        return String(format: "%.0f%%", storage)
    }

    private var cpuColor: Color {
        guard let cpu = database.latestStats?.cpuPercent else { return .textSecondary }
        if cpu > 90 { return .statusDown }
        if cpu > 75 { return .statusDegraded }
        return .textSecondary
    }

    private var storageColor: Color {
        guard let storage = database.latestStats?.storagePercent else { return .textSecondary }
        if storage > 90 { return .statusDown }
        if storage > 80 { return .statusDegraded }
        return .textSecondary
    }
}

struct IssueRow: View {
    let icon: String
    let title: String
    let detail: String
    let color: Color

    var body: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.body)
                .foregroundColor(color)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.labelMedium)
                    .foregroundColor(.textPrimary)

                Text(detail)
                    .font(.bodySmall)
                    .foregroundColor(.textSecondary)
            }

            Spacer()
        }
        .padding(Spacing.sm)
    }
}
